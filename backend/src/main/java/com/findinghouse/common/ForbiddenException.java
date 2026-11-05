package com.findinghouse.common;

/** The caller is authenticated but may not perform this operation, e.g. not the owner (403). */
public class ForbiddenException extends RuntimeException {

  public ForbiddenException(String message) {
    super(message);
  }
}
