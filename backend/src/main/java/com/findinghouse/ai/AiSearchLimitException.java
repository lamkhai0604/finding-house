package com.findinghouse.ai;

import java.time.Duration;

/** T-302: this address has used its AI searches for the hour. */
public class AiSearchLimitException extends RuntimeException {

  private final Duration retryAfter;

  public AiSearchLimitException(Duration retryAfter) {
    super("Too many AI searches");
    this.retryAfter = retryAfter;
  }

  public Duration getRetryAfter() {
    return retryAfter;
  }
}
