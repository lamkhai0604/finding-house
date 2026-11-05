package com.findinghouse.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Failed-login limits (D-024). Defaults are in application.yml. */
@ConfigurationProperties(prefix = "app.login-throttle")
public record LoginThrottleProperties(
    int maxFailuresPerEmail, int maxFailuresPerAddress, Duration window) {

  public LoginThrottleProperties {
    if (maxFailuresPerEmail < 1 || maxFailuresPerAddress < 1) {
      throw new IllegalStateException("app.login-throttle limits must be at least 1");
    }
    if (window == null || window.isNegative() || window.isZero()) {
      throw new IllegalStateException("app.login-throttle.window must be a positive duration");
    }
  }
}
