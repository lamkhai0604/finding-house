package com.findinghouse.common;

import com.findinghouse.auth.AuthExceptions.EmailAlreadyRegisteredException;
import com.findinghouse.auth.AuthExceptions.InvalidCredentialsException;
import com.findinghouse.auth.AuthExceptions.TooManyLoginAttemptsException;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Maps exceptions to {@link ApiError} responses. Never exposes stack traces (CODE-06). */
@RestControllerAdvice
public class ApiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> validationFailed(MethodArgumentNotValidException e) {
    List<ApiError.FieldError> fieldErrors =
        e.getBindingResult().getFieldErrors().stream()
            .map(error -> new ApiError.FieldError(error.getField(), error.getDefaultMessage()))
            .sorted(Comparator.comparing(ApiError.FieldError::field))
            .toList();
    return ResponseEntity.badRequest()
        .body(new ApiError("VALIDATION_FAILED", "Request validation failed", fieldErrors));
  }

  @ExceptionHandler(BadRequestException.class)
  ResponseEntity<ApiError> badRequest(BadRequestException e) {
    return ResponseEntity.badRequest()
        .body(
            new ApiError(
                "VALIDATION_FAILED",
                "Request validation failed",
                List.of(new ApiError.FieldError(e.getField(), e.getMessage()))));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException e) {
    return ResponseEntity.badRequest()
        .body(ApiError.of("MALFORMED_REQUEST", "Request body is missing or not valid JSON"));
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException e) {
    return ResponseEntity.badRequest()
        .body(
            new ApiError(
                "VALIDATION_FAILED",
                "Request validation failed",
                List.of(new ApiError.FieldError(e.getName(), "has an invalid value"))));
  }

  @ExceptionHandler(NotFoundException.class)
  ResponseEntity<ApiError> notFound(NotFoundException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiError.of("NOT_FOUND", e.getMessage()));
  }

  @ExceptionHandler(ForbiddenException.class)
  ResponseEntity<ApiError> forbidden(ForbiddenException e) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiError.of("FORBIDDEN", e.getMessage()));
  }

  @ExceptionHandler(EmailAlreadyRegisteredException.class)
  ResponseEntity<ApiError> emailTaken(EmailAlreadyRegisteredException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiError.of("EMAIL_TAKEN", e.getMessage()));
  }

  @ExceptionHandler(TooManyLoginAttemptsException.class)
  ResponseEntity<ApiError> tooManyLoginAttempts(TooManyLoginAttemptsException e) {
    long seconds = Math.max(1, (e.getRetryAfter().toMillis() + 999) / 1000);
    long minutes = Math.max(1, (seconds + 59) / 60);
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .header(HttpHeaders.RETRY_AFTER, String.valueOf(seconds))
        .body(
            ApiError.of(
                "TOO_MANY_ATTEMPTS",
                "Too many failed login attempts. Try again in "
                    + minutes
                    + (minutes == 1 ? " minute." : " minutes.")));
  }

  @ExceptionHandler(InvalidCredentialsException.class)
  ResponseEntity<ApiError> invalidCredentials(InvalidCredentialsException e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiError.of("INVALID_CREDENTIALS", e.getMessage()));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> unexpected(Exception e) {
    if (e instanceof ErrorResponse errorResponse) {
      // Spring MVC's own errors (404 no route, 405 wrong method, 415, ...) keep their status.
      HttpStatusCode status = errorResponse.getStatusCode();
      String code =
          status instanceof HttpStatus known ? known.name() : String.valueOf(status.value());
      return ResponseEntity.status(status).body(ApiError.of(code, "Request could not be handled"));
    }
    log.error("Unhandled exception", e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("INTERNAL_ERROR", "Something went wrong"));
  }
}
