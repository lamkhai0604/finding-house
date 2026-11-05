package com.findinghouse.common;

/** A request that is well-formed but breaks a business rule on one field (HTTP 400). */
public class BadRequestException extends RuntimeException {

  private final String field;

  public BadRequestException(String field, String message) {
    super(message);
    this.field = field;
  }

  public String getField() {
    return field;
  }
}
