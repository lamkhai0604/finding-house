package com.findinghouse.ai;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * T-301 (FR-05): where the AI search provider is and how long to wait for it. Any provider with an
 * OpenAI-compatible chat completions API works (D-035 proposed: Groq). AI search is off unless the
 * base URL, the model and the key are all set; the key only ever comes from the environment.
 */
@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(String baseUrl, String model, String apiKey, Duration timeout) {

  public AiProperties {
    baseUrl = baseUrl == null ? "" : baseUrl.strip().replaceAll("/+$", "");
    model = model == null ? "" : model.strip();
    apiKey = apiKey == null ? "" : apiKey.strip();
    timeout = timeout == null ? Duration.ofSeconds(5) : timeout;
    if (timeout.isNegative() || timeout.isZero() || timeout.compareTo(Duration.ofSeconds(30)) > 0) {
      throw new IllegalStateException("app.ai.timeout must be between 1 ms and 30 s");
    }
    if (!baseUrl.isEmpty() && !isAllowedBaseUrl(baseUrl)) {
      // The key travels in a header, so it must never go over plain HTTP to another machine.
      throw new IllegalStateException(
          "app.ai.base-url must be an https URL (http is allowed only for localhost)");
    }
  }

  /** True when AI search can be offered. */
  public boolean enabled() {
    return !baseUrl.isEmpty() && !model.isEmpty() && !apiKey.isEmpty();
  }

  private static boolean isAllowedBaseUrl(String value) {
    URI uri;
    try {
      uri = URI.create(value);
    } catch (IllegalArgumentException e) {
      return false;
    }
    String host = uri.getHost();
    if (host == null) {
      return false;
    }
    if ("https".equals(uri.getScheme())) {
      return true;
    }
    return "http".equals(uri.getScheme()) && ("localhost".equals(host) || "127.0.0.1".equals(host));
  }
}
