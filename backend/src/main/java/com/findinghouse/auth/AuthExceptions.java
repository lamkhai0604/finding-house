package com.findinghouse.auth;

/**
 * Business errors raised by {@link AuthService}; mapped to HTTP responses in ApiExceptionHandler.
 */
public final class AuthExceptions {

  private AuthExceptions() {}

  /** Registration with an email that already has an account (HTTP 409). */
  public static class EmailAlreadyRegisteredException extends RuntimeException {
    public EmailAlreadyRegisteredException() {
      super("An account with this email already exists");
    }
  }

  /**
   * Login failed. The message is the same whether the email or the password was wrong (HTTP 401).
   */
  public static class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
      super("Invalid email or password");
    }
  }
}
