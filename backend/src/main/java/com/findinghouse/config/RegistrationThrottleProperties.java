package com.findinghouse.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Sign-up attempts allowed per client address and window (T-113). Defaults in application.yml. */
@ConfigurationProperties(prefix = "app.registration-throttle")
public record RegistrationThrottleProperties(int maxPerAddress, Duration window) {

  public RegistrationThrottleProperties {
    if (maxPerAddress < 1) {
      throw new IllegalStateException(
          "app.registration-throttle.max-per-address must be at least 1");
    }
    if (window == null || window.isNegative() || window.isZero()) {
      throw new IllegalStateException(
          "app.registration-throttle.window must be a positive duration");
    }
  }
}
