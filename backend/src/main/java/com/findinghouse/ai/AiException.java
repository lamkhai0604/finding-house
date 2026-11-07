package com.findinghouse.ai;

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

  public AiException(Kind kind, String message) {
    super(message);
    this.kind = kind;
  }

  public AiException(Kind kind, String message, Throwable cause) {
    super(message, cause);
    this.kind = kind;
  }

  public Kind kind() {
    return kind;
  }
}
