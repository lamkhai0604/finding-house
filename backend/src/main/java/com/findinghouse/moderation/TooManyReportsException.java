package com.findinghouse.moderation;

import java.time.Duration;

/** D-038: the daily report limit was reached (429 with Retry-After). */
public class TooManyReportsException extends RuntimeException {

  private final Duration retryAfter;

  public TooManyReportsException(Duration retryAfter) {
    super("Too many reports");
    this.retryAfter = retryAfter;
  }

  public Duration getRetryAfter() {
    return retryAfter;
  }
}
