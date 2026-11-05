package com.findinghouse.auth;

import com.findinghouse.auth.AuthDtos.LoginRequest;
import com.findinghouse.auth.AuthDtos.RegisterRequest;
import com.findinghouse.auth.AuthExceptions.EmailAlreadyRegisteredException;
import com.findinghouse.auth.AuthExceptions.InvalidCredentialsException;
import com.findinghouse.auth.AuthExceptions.TooManyLoginAttemptsException;
import com.findinghouse.common.BadRequestException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registration and login rules for FR-01. */
@Service
public class AuthService {

  /** BCrypt ignores everything after 72 bytes, so longer passwords are never accepted. */
  static final int MAX_PASSWORD_BYTES = 72;

  private final UserAccountRepository users;
  private final PasswordEncoder passwordEncoder;
  private final TokenService tokenService;
  private final LoginThrottle throttle;
  private final Clock clock;

  /**
   * Compared against when the email is unknown, so a failed login takes about as long whether or
   * not the account exists.
   */
  private final String dummyPasswordHash;

  public AuthService(
      UserAccountRepository users,
      PasswordEncoder passwordEncoder,
      TokenService tokenService,
      LoginThrottle throttle,
      Clock clock) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.tokenService = tokenService;
    this.throttle = throttle;
    this.clock = clock;
    this.dummyPasswordHash = passwordEncoder.encode("timing-equalizer-not-a-real-password");
  }

  @Transactional
  public UserAccount register(RegisterRequest request) {
    String email = normalizeEmail(request.email());
    String phone = blankToNull(request.phone());
    if (passwordBytes(request.password()) > MAX_PASSWORD_BYTES) {
      throw new BadRequestException(
          "password", "must be at most " + MAX_PASSWORD_BYTES + " bytes (fewer accented letters)");
    }
    if (phone != null && request.role() != Role.LANDLORD) {
      throw new BadRequestException("phone", "only landlords can add a contact phone number");
    }
    if (users.existsByEmail(email)) {
      throw new EmailAlreadyRegisteredException();
    }
    UserAccount user =
        new UserAccount(
            email,
            passwordEncoder.encode(request.password()),
            request.displayName().trim(),
            request.role(),
            phone,
            clock.instant());
    try {
      return users.saveAndFlush(user);
    } catch (DataIntegrityViolationException e) {
      // Another request registered the same email between the check and the insert.
      throw new EmailAlreadyRegisteredException();
    }
  }

  /**
   * FR-01 AC4 and D-024. Blocked emails or addresses are refused before the password is checked, so
   * a blocked attacker learns nothing. Failures are counted whether or not the email exists.
   */
  @Transactional(readOnly = true)
  public TokenService.IssuedToken login(LoginRequest request, String clientAddress) {
    String email = normalizeEmail(request.email());
    throttle
        .retryAfter(email, clientAddress)
        .ifPresent(
            wait -> {
              throw new TooManyLoginAttemptsException(wait);
            });
    Optional<UserAccount> user = users.findByEmail(email);
    boolean passwordMatches =
        passwordBytes(request.password()) <= MAX_PASSWORD_BYTES
            && passwordEncoder.matches(
                request.password(),
                user.map(UserAccount::getPasswordHash).orElse(dummyPasswordHash));
    if (user.isEmpty() || !passwordMatches) {
      throttle.recordFailure(email, clientAddress);
      throw new InvalidCredentialsException();
    }
    throttle.recordSuccess(email);
    return tokenService.issue(user.get());
  }

  @Transactional(readOnly = true)
  public Optional<UserAccount> findById(long id) {
    return users.findById(id);
  }

  static String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private static int passwordBytes(String password) {
    return password.getBytes(StandardCharsets.UTF_8).length;
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
