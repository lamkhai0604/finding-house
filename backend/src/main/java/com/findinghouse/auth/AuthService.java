package com.findinghouse.auth;

import com.findinghouse.auth.AuthDtos.LoginRequest;
import com.findinghouse.auth.AuthDtos.RegisterRequest;
import com.findinghouse.auth.AuthExceptions.EmailAlreadyRegisteredException;
import com.findinghouse.auth.AuthExceptions.InvalidCredentialsException;
import com.findinghouse.common.BadRequestException;
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

  private final UserAccountRepository users;
  private final PasswordEncoder passwordEncoder;
  private final TokenService tokenService;
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
      Clock clock) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.tokenService = tokenService;
    this.clock = clock;
    this.dummyPasswordHash = passwordEncoder.encode("timing-equalizer-not-a-real-password");
  }

  @Transactional
  public UserAccount register(RegisterRequest request) {
    String email = normalizeEmail(request.email());
    String phone = blankToNull(request.phone());
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

  @Transactional(readOnly = true)
  public TokenService.IssuedToken login(LoginRequest request) {
    Optional<UserAccount> user = users.findByEmail(normalizeEmail(request.email()));
    String hash = user.map(UserAccount::getPasswordHash).orElse(dummyPasswordHash);
    boolean passwordMatches = passwordEncoder.matches(request.password(), hash);
    if (user.isEmpty() || !passwordMatches) {
      throw new InvalidCredentialsException();
    }
    return tokenService.issue(user.get());
  }

  @Transactional(readOnly = true)
  public Optional<UserAccount> findById(long id) {
    return users.findById(id);
  }

  static String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
