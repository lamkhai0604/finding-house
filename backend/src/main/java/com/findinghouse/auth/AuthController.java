package com.findinghouse.auth;

import com.findinghouse.auth.AuthDtos.LoginRequest;
import com.findinghouse.auth.AuthDtos.RegisterRequest;
import com.findinghouse.auth.AuthDtos.TokenResponse;
import com.findinghouse.auth.AuthDtos.UserResponse;
import com.findinghouse.auth.AuthExceptions.InvalidCredentialsException;
import com.findinghouse.auth.AuthExceptions.TooManyRegistrationsException;
import com.findinghouse.common.ClientAddressResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

  private final AuthService authService;
  private final ClientAddressResolver clientAddress;
  private final RegistrationThrottle registrationThrottle;

  public AuthController(
      AuthService authService,
      ClientAddressResolver clientAddress,
      RegistrationThrottle registrationThrottle) {
    this.authService = authService;
    this.clientAddress = clientAddress;
    this.registrationThrottle = registrationThrottle;
  }

  /** T-113: each well-formed attempt counts against the client address, successful or not. */
  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  public UserResponse register(
      @Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
    registrationThrottle
        .tryAcquire(clientAddress.resolve(httpRequest))
        .ifPresent(
            wait -> {
              throw new TooManyRegistrationsException(wait);
            });
    return UserResponse.from(authService.register(request));
  }

  /** D-024 limits are keyed on the client address from {@link ClientAddressResolver} (D-030). */
  @PostMapping("/auth/login")
  public TokenResponse login(
      @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
    TokenService.IssuedToken token = authService.login(request, clientAddress.resolve(httpRequest));
    return new TokenResponse(token.value(), "Bearer", token.expiresInSeconds());
  }

  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
    long userId = Long.parseLong(jwt.getSubject());
    // A valid token for an account that no longer exists is treated as not authenticated.
    return authService
        .findById(userId)
        .map(UserResponse::from)
        .orElseThrow(InvalidCredentialsException::new);
  }
}
