package com.findinghouse.common;

/** The request repeats something that already exists, e.g. a second open report (409). */
public class ConflictException extends RuntimeException {

  public ConflictException(String message) {
    super(message);
  }
}
