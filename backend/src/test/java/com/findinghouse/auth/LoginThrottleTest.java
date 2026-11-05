package com.findinghouse.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.config.LoginThrottleProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** D-024 rules with a controllable clock, no Spring or database. */
class LoginThrottleTest {

  private static final Duration WINDOW = Duration.ofMinutes(15);

  private MutableClock clock;
  private LoginThrottle throttle;

  @BeforeEach
  void setUp() {
    clock = new MutableClock(Instant.parse("2026-11-05T12:00:00Z"));
    throttle = new LoginThrottle(new LoginThrottleProperties(5, 20, WINDOW), clock);
  }

  @Test
  void blocksAnEmailAfterFiveFailuresUntilTheWindowEnds() {
    for (int i = 0; i < 4; i++) {
      throttle.recordFailure("ana@example.com", "10.0.0.1");
    }
    assertThat(throttle.retryAfter("ana@example.com", "10.0.0.1")).isEmpty();

    throttle.recordFailure("ana@example.com", "10.0.0.1");
    assertThat(throttle.retryAfter("ana@example.com", "10.0.0.1")).contains(WINDOW);

    clock.advance(Duration.ofMinutes(10));
    assertThat(throttle.retryAfter("ana@example.com", "10.0.0.1")).contains(Duration.ofMinutes(5));

    clock.advance(Duration.ofMinutes(5));
    assertThat(throttle.retryAfter("ana@example.com", "10.0.0.1")).isEmpty();
  }

  @Test
  void blockedEmailIsBlockedFromAnyAddress() {
    for (int i = 0; i < 5; i++) {
      throttle.recordFailure("ana@example.com", "10.0.0." + i);
    }

    assertThat(throttle.retryAfter("ana@example.com", "192.168.1.1")).isPresent();
    assertThat(throttle.retryAfter("ben@example.com", "192.168.1.1")).isEmpty();
  }

  @Test
  void blocksAnAddressTryingManyEmails() {
    for (int i = 0; i < 20; i++) {
      throttle.recordFailure("user" + i + "@example.com", "10.0.0.9");
    }

    assertThat(throttle.retryAfter("someone-new@example.com", "10.0.0.9")).isPresent();
    assertThat(throttle.retryAfter("someone-new@example.com", "10.0.0.10")).isEmpty();
  }

  @Test
  void successClearsTheEmailButNotTheAddress() {
    for (int i = 0; i < 4; i++) {
      throttle.recordFailure("ana@example.com", "10.0.0.1");
    }
    throttle.recordSuccess("ana@example.com");
    throttle.recordFailure("ana@example.com", "10.0.0.1");

    assertThat(throttle.retryAfter("ana@example.com", "10.0.0.1")).isEmpty();
  }

  @Test
  void failuresAfterAnExpiredWindowStartANewWindow() {
    for (int i = 0; i < 4; i++) {
      throttle.recordFailure("ana@example.com", "10.0.0.1");
    }
    clock.advance(WINDOW);
    throttle.recordFailure("ana@example.com", "10.0.0.1");

    assertThat(throttle.retryAfter("ana@example.com", "10.0.0.1")).isEmpty();
  }

  @Test
  void expiredEntriesArePurgedSoMemoryStaysBounded() {
    for (int i = 0; i <= LoginThrottle.PURGE_THRESHOLD; i++) {
      throttle.recordFailure("user" + i + "@example.com", "10.0.0.1");
    }
    clock.advance(WINDOW);

    throttle.recordFailure("late@example.com", "10.0.0.2");

    assertThat(throttle.trackedKeys()).isEqualTo(2);
  }

  /** A clock tests can move forward. */
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
