package com.findinghouse.auth;

import com.findinghouse.auth.AuthDtos.LoginRequest;
import com.findinghouse.auth.AuthDtos.RegisterRequest;
import com.findinghouse.auth.AuthDtos.TokenResponse;
import com.findinghouse.auth.AuthDtos.UserResponse;
import com.findinghouse.auth.AuthExceptions.InvalidCredentialsException;
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

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  public UserResponse register(@Valid @RequestBody RegisterRequest request) {
    return UserResponse.from(authService.register(request));
  }

  /**
   * The client address is the TCP peer. Behind a reverse proxy (Sprint 3 deployment), forwarded
   * headers must be configured so this is the real client and not the proxy.
   */
  @PostMapping("/auth/login")
  public TokenResponse login(
      @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
    TokenService.IssuedToken token = authService.login(request, httpRequest.getRemoteAddr());
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
