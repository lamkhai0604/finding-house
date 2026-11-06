package com.findinghouse.auth;

import com.findinghouse.config.RegistrationThrottleProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * T-113: limits sign-up attempts per client address (default 10 per hour). Every attempt with a
 * well-formed body counts, including ones rejected because the email is taken, so the endpoint
 * cannot be used to test many emails or to create accounts in bulk.
 *
 * <p>In memory, like {@link LoginThrottle}: correct for the single instance the demo runs.
 */
@Component
public class RegistrationThrottle {

  static final int PURGE_THRESHOLD = 10_000;

  private final RegistrationThrottleProperties properties;
  private final Clock clock;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  public RegistrationThrottle(RegistrationThrottleProperties properties, Clock clock) {
    this.properties = properties;
    this.clock = clock;
  }

  /**
   * Counts this attempt. Returns how long to wait if the address has used up its attempts (this one
   * included is refused), or empty if the attempt may proceed.
   */
  public Optional<Duration> tryAcquire(String clientAddress) {
    Instant now = clock.instant();
    Duration length = properties.window();
    Window window =
        windows.compute(
            clientAddress,
            (k, current) ->
                current == null || current.isExpired(now, length)
                    ? new Window(now, 1)
                    : new Window(current.start(), current.attempts() + 1));
    if (windows.size() > PURGE_THRESHOLD) {
      windows.entrySet().removeIf(entry -> entry.getValue().isExpired(now, length));
    }
    if (window.attempts() <= properties.maxPerAddress()) {
      return Optional.empty();
    }
    return Optional.of(Duration.between(now, window.start().plus(length)));
  }

  int trackedAddresses() {
    return windows.size();
  }

  private record Window(Instant start, int attempts) {
    boolean isExpired(Instant now, Duration length) {
      return !now.isBefore(start.plus(length));
    }
  }
}
