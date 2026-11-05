package com.findinghouse.common;

import java.util.List;

/** The single JSON error shape returned by the API (ARCHITECTURE §5). */
public record ApiError(String code, String message, List<FieldError> fieldErrors) {

  public static ApiError of(String code, String message) {
    return new ApiError(code, message, List.of());
  }

  public record FieldError(String field, String message) {}
}
