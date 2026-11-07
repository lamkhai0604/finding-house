package com.findinghouse.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * T-302: how often AI search may be used. Per address so one visitor cannot use it all; per minute
 * and per day overall so we stay under the provider's free limits (Groq: 30 requests and 8,000
 * tokens a minute, 1,000 requests a day; about 800 tokens a search) and answer "busy" ourselves
 * instead of hitting the provider's 429.
 */
@ConfigurationProperties(prefix = "app.ai.limits")
public record AiLimitsProperties(int perAddressPerHour, int perMinute, int perDay) {

  public AiLimitsProperties {
    if (perAddressPerHour < 1 || perMinute < 1 || perDay < 1) {
      throw new IllegalStateException("app.ai.limits.* must all be at least 1");
    }
  }
}
