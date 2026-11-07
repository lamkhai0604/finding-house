package com.findinghouse.ai;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * T-302: AI search limits (see {@link AiLimitsProperties}). In memory, like the login and sign-up
 * limits: right for the single instance the demo runs, and reset on restart.
 */
@Component
public class AiSearchThrottle {

  static final int PURGE_THRESHOLD = 10_000;
  private static final Duration HOUR = Duration.ofHours(1);
  private static final Duration MINUTE = Duration.ofMinutes(1);
  private static final Duration DAY = Duration.ofDays(1);

  /** Which limit refused a search, and when it frees up. */
  public record Refusal(boolean perAddress, Duration retryAfter) {}

  private final AiLimitsProperties limits;
  private final Clock clock;
  private final ConcurrentHashMap<String, Window> perAddress = new ConcurrentHashMap<>();
  private Window minute;
  private Window day;

  public AiSearchThrottle(AiLimitsProperties limits, Clock clock) {
    this.limits = limits;
    this.clock = clock;
  }

  /**
   * Counts one search. The per-address limit counts every attempt; the shared budget only counts
   * searches that will actually reach the provider.
   */
  public Optional<Refusal> tryAcquire(String clientAddress) {
    Instant now = clock.instant();
    Window mine =
        perAddress.compute(
            clientAddress,
            (k, current) ->
                current == null || current.isExpired(now, HOUR)
                    ? new Window(now, 1)
                    : new Window(current.start(), current.count() + 1));
    if (perAddress.size() > PURGE_THRESHOLD) {
      perAddress.entrySet().removeIf(entry -> entry.getValue().isExpired(now, HOUR));
    }
    if (mine.count() > limits.perAddressPerHour()) {
      return Optional.of(new Refusal(true, mine.remaining(now, HOUR)));
    }
    return takeFromBudget(now);
  }

  private synchronized Optional<Refusal> takeFromBudget(Instant now) {
    if (minute == null || minute.isExpired(now, MINUTE)) {
      minute = new Window(now, 0);
    }
    if (day == null || day.isExpired(now, DAY)) {
      day = new Window(now, 0);
    }
    if (day.count() >= limits.perDay()) {
      return Optional.of(new Refusal(false, day.remaining(now, DAY)));
    }
    if (minute.count() >= limits.perMinute()) {
      return Optional.of(new Refusal(false, minute.remaining(now, MINUTE)));
    }
    minute = new Window(minute.start(), minute.count() + 1);
    day = new Window(day.start(), day.count() + 1);
    return Optional.empty();
  }

  private record Window(Instant start, int count) {
    boolean isExpired(Instant now, Duration length) {
      return !now.isBefore(start.plus(length));
    }

    Duration remaining(Instant now, Duration length) {
      return Duration.between(now, start.plus(length));
    }
  }
}
