package com.findinghouse.config;

import java.net.URI;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

/**
 * HTTP edge settings for deployment (T-114a, D-030). Defaults (in application.yml) suit local
 * development: no client-address header is trusted and no other origin may call the API.
 *
 * @param clientIpHeader header holding the real client address, set by a proxy the app always sits
 *     behind (on Render: {@code CF-Connecting-IP}, set by Cloudflare). Empty: use the TCP peer.
 * @param corsAllowedOrigins exact origins of the frontend allowed to call the API from a browser.
 * @param maxRequestSize largest request body accepted.
 */
@ConfigurationProperties(prefix = "app.http")
public record HttpProperties(
    String clientIpHeader, List<String> corsAllowedOrigins, DataSize maxRequestSize) {

  public HttpProperties {
    clientIpHeader = clientIpHeader == null ? "" : clientIpHeader.strip();
    corsAllowedOrigins =
        corsAllowedOrigins == null
            ? List.of()
            : corsAllowedOrigins.stream().map(String::strip).filter(o -> !o.isEmpty()).toList();
    for (String origin : corsAllowedOrigins) {
      requireExactOrigin(origin);
    }
    if (maxRequestSize == null || maxRequestSize.toBytes() < 1_024) {
      throw new IllegalStateException("app.http.max-request-size must be at least 1KB");
    }
  }

  /** An origin is scheme://host[:port] with nothing else; wildcards are refused on purpose. */
  private static void requireExactOrigin(String origin) {
    URI uri;
    try {
      uri = URI.create(origin);
    } catch (IllegalArgumentException e) {
      throw new IllegalStateException("app.http.cors-allowed-origins: not a URL: " + origin, e);
    }
    boolean https = "https".equals(uri.getScheme());
    boolean localHttp =
        "http".equals(uri.getScheme())
            && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()));
    boolean bare =
        uri.getHost() != null
            && (uri.getRawPath() == null || uri.getRawPath().isEmpty())
            && uri.getRawQuery() == null
            && uri.getRawFragment() == null
            && uri.getRawUserInfo() == null;
    if (!(https || localHttp) || !bare || origin.contains("*")) {
      throw new IllegalStateException(
          "app.http.cors-allowed-origins must list exact https:// origins (or http://localhost),"
              + " without paths or wildcards: "
              + origin);
    }
  }
}
