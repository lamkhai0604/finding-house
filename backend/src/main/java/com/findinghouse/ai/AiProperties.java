package com.findinghouse.ai;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

/**
 * T-301 (FR-05): where the AI search provider is and how long to wait for it. Any provider with an
 * OpenAI-compatible chat completions API works (D-035 proposed: Groq). AI search is off unless the
 * base URL, the model and the key are all set; the key only ever comes from the environment.
 *
 * <p>{@code maxTokens} caps the reply. Reasoning models (e.g. {@code openai/gpt-oss-20b}) spend
 * part of it on hidden reasoning, so it must leave room for that as well as the JSON. {@code
 * reasoningEffort} is sent only when set ({@code low}, {@code medium} or {@code high}); providers
 * and models without it leave it empty.
 */
@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
    String baseUrl,
    String model,
    String apiKey,
    Duration timeout,
    Integer maxTokens,
    String reasoningEffort) {

  static final int DEFAULT_MAX_TOKENS = 1024;
  private static final List<String> REASONING_EFFORTS = List.of("low", "medium", "high");

  // Two constructors: tell Spring to bind through the canonical one.
  @ConstructorBinding
  public AiProperties {
    baseUrl = baseUrl == null ? "" : baseUrl.strip().replaceAll("/+$", "");
    model = model == null ? "" : model.strip();
    apiKey = apiKey == null ? "" : apiKey.strip();
    timeout = timeout == null ? Duration.ofSeconds(5) : timeout;
    maxTokens = maxTokens == null ? DEFAULT_MAX_TOKENS : maxTokens;
    reasoningEffort =
        reasoningEffort == null ? "" : reasoningEffort.strip().toLowerCase(Locale.ROOT);
    if (maxTokens < 64 || maxTokens > 8192) {
      throw new IllegalStateException("app.ai.max-tokens must be between 64 and 8192");
    }
    if (!reasoningEffort.isEmpty() && !REASONING_EFFORTS.contains(reasoningEffort)) {
      throw new IllegalStateException("app.ai.reasoning-effort must be empty, low, medium or high");
    }
    if (timeout.isNegative() || timeout.isZero() || timeout.compareTo(Duration.ofSeconds(30)) > 0) {
      throw new IllegalStateException("app.ai.timeout must be between 1 ms and 30 s");
    }
    if (!baseUrl.isEmpty() && !isAllowedBaseUrl(baseUrl)) {
      // The key travels in a header, so it must never go over plain HTTP to another machine.
      throw new IllegalStateException(
          "app.ai.base-url must be an https URL (http is allowed only for localhost)");
    }
  }

  /** Settings without the optional tuning, as the tests and simple providers use them. */
  public AiProperties(String baseUrl, String model, String apiKey, Duration timeout) {
    this(baseUrl, model, apiKey, timeout, null, null);
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
