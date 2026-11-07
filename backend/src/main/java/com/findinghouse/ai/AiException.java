package com.findinghouse.ai;

import java.time.Duration;
import java.util.Optional;

/**
 * T-301 / T-304: why AI search could not answer. Messages are for logs and never contain the user's
 * query. Every kind leaves manual search working (NFR-04).
 */
public class AiException extends RuntimeException {

  public enum Kind {
    /** No provider configured (no key). */
    UNAVAILABLE,
    /** The provider did not answer in time. */
    TIMEOUT,
    /** The provider (or our own budget) is rate limiting. */
    BUSY,
    /** Any other failure: network, 5xx, or a reply we could not read. */
    FAILED
  }

  private final Kind kind;
  private final Duration retryAfter;

  public AiException(Kind kind, String message) {
    this(kind, message, null, null);
  }

  public AiException(Kind kind, String message, Throwable cause) {
    this(kind, message, cause, null);
  }

  /** BUSY because our own budget is used up: {@code retryAfter} says when it frees up (T-302). */
  public AiException(Kind kind, String message, Throwable cause, Duration retryAfter) {
    super(message, cause);
    this.kind = kind;
    this.retryAfter = retryAfter;
  }

  public Kind kind() {
    return kind;
  }

  /** How long to wait before trying again, when known. */
  public Optional<Duration> retryAfter() {
    return Optional.ofNullable(retryAfter);
  }
}
