package com.findinghouse.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request and response bodies for the auth endpoints (FR-01). */
public final class AuthDtos {

  private AuthDtos() {}

  /** BCrypt only uses the first 72 bytes of a password, so longer input is rejected. */
  public record RegisterRequest(
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(min = 8, max = 72) String password,
      @NotBlank @Size(max = 50) String displayName,
      @NotNull Role role,
      @Size(max = 30)
          @Pattern(regexp = "^[0-9+()\\-. ]*$", message = "may contain only digits and + ( ) - .")
          String phone) {}

  public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

  public record UserResponse(Long id, String email, String displayName, Role role, String phone) {

    static UserResponse from(UserAccount user) {
      return new UserResponse(
          user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(), user.getPhone());
    }
  }

  public record TokenResponse(String accessToken, String tokenType, long expiresIn) {}
}
