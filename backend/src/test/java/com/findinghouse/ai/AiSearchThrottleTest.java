package com.findinghouse.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/** T-302: the per-address limit and the shared per-minute and per-day budget. */
class AiSearchThrottleTest {

  static final class MovableClock extends Clock {
    Instant now = Instant.parse("2026-11-07T00:00:00Z");

    @Override
    public java.time.ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(java.time.ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return now;
    }

    void advance(Duration d) {
      now = now.plus(d);
    }
  }

  @Test
  void eachAddressGetsItsOwnHourlyAllowance() {
    MovableClock clock = new MovableClock();
    AiSearchThrottle throttle = new AiSearchThrottle(new AiLimitsProperties(2, 100, 1000), clock);

    assertThat(throttle.tryAcquire("a")).isEmpty();
    assertThat(throttle.tryAcquire("a")).isEmpty();
    assertThat(throttle.tryAcquire("a"))
        .hasValueSatisfying(
            r -> {
              assertThat(r.perAddress()).isTrue();
              assertThat(r.retryAfter()).isEqualTo(Duration.ofHours(1));
            });
    assertThat(throttle.tryAcquire("b")).isEmpty();

    clock.advance(Duration.ofHours(1));
    assertThat(throttle.tryAcquire("a")).isEmpty();
  }

  @Test
  void theSharedBudgetStopsEveryoneBelowTheProviderLimits() {
    MovableClock clock = new MovableClock();
    AiSearchThrottle throttle = new AiSearchThrottle(new AiLimitsProperties(100, 2, 3), clock);

    assertThat(throttle.tryAcquire("a")).isEmpty();
    assertThat(throttle.tryAcquire("b")).isEmpty();
    assertThat(throttle.tryAcquire("c"))
        .hasValueSatisfying(r -> assertThat(r.perAddress()).isFalse());

    clock.advance(Duration.ofMinutes(1));
    assertThat(throttle.tryAcquire("c")).isEmpty();
    // Three reached the provider today: the daily budget is used up even in a new minute.
    clock.advance(Duration.ofMinutes(1));
    assertThat(throttle.tryAcquire("d"))
        .hasValueSatisfying(
            r -> {
              assertThat(r.perAddress()).isFalse();
              assertThat(r.retryAfter()).isEqualTo(Duration.ofDays(1).minusMinutes(2));
            });
  }
}
