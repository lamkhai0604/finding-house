package com.findinghouse.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.findinghouse.config.RegistrationThrottleProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** T-113 rules with a controllable clock. */
class RegistrationThrottleTest {

  private static final Duration WINDOW = Duration.ofHours(1);

  private MutableClock clock;
  private RegistrationThrottle throttle;

  @BeforeEach
  void setUp() {
    clock = new MutableClock(Instant.parse("2026-11-05T12:00:00Z"));
    throttle = new RegistrationThrottle(new RegistrationThrottleProperties(3, WINDOW), clock);
  }

  @Test
  void allowsTheLimitThenRefusesUntilTheWindowEnds() {
    for (int i = 0; i < 3; i++) {
      assertThat(throttle.tryAcquire("203.0.113.7")).as("attempt %d", i + 1).isEmpty();
    }
    assertThat(throttle.tryAcquire("203.0.113.7")).contains(WINDOW);

    clock.advance(Duration.ofMinutes(40));
    assertThat(throttle.tryAcquire("203.0.113.7")).contains(Duration.ofMinutes(20));

    clock.advance(Duration.ofMinutes(20));
    assertThat(throttle.tryAcquire("203.0.113.7")).isEmpty();
  }

  @Test
  void addressesAreCountedSeparately() {
    for (int i = 0; i < 4; i++) {
      throttle.tryAcquire("203.0.113.7");
    }

    assertThat(throttle.tryAcquire("203.0.113.8")).isEmpty();
  }

  @Test
  void expiredAddressesAreForgottenWhenManyAreTracked() {
    for (int i = 0; i <= RegistrationThrottle.PURGE_THRESHOLD; i++) {
      throttle.tryAcquire("addr-" + i);
    }
    clock.advance(WINDOW);

    throttle.tryAcquire("fresh");

    assertThat(throttle.trackedAddresses()).isEqualTo(1);
  }

  @Test
  void refusesNonsenseSettings() {
    assertThatThrownBy(() -> new RegistrationThrottleProperties(0, WINDOW))
        .isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(() -> new RegistrationThrottleProperties(5, Duration.ZERO))
        .isInstanceOf(IllegalStateException.class);
  }

  private static final class MutableClock extends Clock {
    private Instant now;

    MutableClock(Instant start) {
      this.now = start;
    }

    void advance(Duration duration) {
      now = now.plus(duration);
    }

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return now;
    }
  }
}
