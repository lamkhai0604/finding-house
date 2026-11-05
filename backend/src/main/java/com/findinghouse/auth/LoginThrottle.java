package com.findinghouse.auth;

import com.findinghouse.config.LoginThrottleProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Limits failed logins (D-024): too many failures for one email, or from one client address, within
 * a window blocks further attempts for that key until the window ends. Blocking is temporary on
 * purpose, so an attacker cannot lock a real user out for long.
 *
 * <p>State is in memory: correct for a single instance (the MVP). Several instances would need a
 * shared store; this is recorded as a known limitation.
 */
@Component
public class LoginThrottle {

  /** Above this many tracked keys, expired entries are purged to keep memory bounded. */
  static final int PURGE_THRESHOLD = 10_000;

  private final LoginThrottleProperties properties;
  private final Clock clock;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  public LoginThrottle(LoginThrottleProperties properties, Clock clock) {
    this.properties = properties;
    this.clock = clock;
  }

  /** How long the caller must wait, if this email or address is currently blocked. */
  public Optional<Duration> retryAfter(String email, String clientAddress) {
    Instant now = clock.instant();
    Optional<Duration> byEmail = blockedFor(emailKey(email), properties.maxFailuresPerEmail(), now);
    Optional<Duration> byAddress =
        blockedFor(addressKey(clientAddress), properties.maxFailuresPerAddress(), now);
    if (byEmail.isPresent() && byAddress.isPresent()) {
      return Optional.of(max(byEmail.get(), byAddress.get()));
    }
    return byEmail.or(() -> byAddress);
  }

  public void recordFailure(String email, String clientAddress) {
    Instant now = clock.instant();
    increment(emailKey(email), now);
    increment(addressKey(clientAddress), now);
    if (windows.size() > PURGE_THRESHOLD) {
      windows.entrySet().removeIf(entry -> entry.getValue().isExpired(now, properties.window()));
    }
  }

  /** A successful login clears the email's failures (not the address's). */
  public void recordSuccess(String email) {
    windows.remove(emailKey(email));
  }

  int trackedKeys() {
    return windows.size();
  }

  private Optional<Duration> blockedFor(String key, int maxFailures, Instant now) {
    Window window = windows.get(key);
    if (window == null || window.isExpired(now, properties.window())) {
      return Optional.empty();
    }
    if (window.failures() < maxFailures) {
      return Optional.empty();
    }
    return Optional.of(Duration.between(now, window.start().plus(properties.window())));
  }

  private void increment(String key, Instant now) {
    windows.compute(
        key,
        (k, current) ->
            current == null || current.isExpired(now, properties.window())
                ? new Window(now, 1)
                : new Window(current.start(), current.failures() + 1));
  }

  private static String emailKey(String email) {
    return "email:" + email;
  }

  private static String addressKey(String clientAddress) {
    return "addr:" + clientAddress;
  }

  private static Duration max(Duration a, Duration b) {
    return a.compareTo(b) >= 0 ? a : b;
  }

  /** Failures counted from the first failure in the window (a fixed window per key). */
  private record Window(Instant start, int failures) {
    boolean isExpired(Instant now, Duration length) {
      return !now.isBefore(start.plus(length));
    }
  }
}
