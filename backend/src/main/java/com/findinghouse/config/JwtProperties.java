package com.findinghouse.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT settings (D-009). The secret comes from the JWT_SECRET environment variable; there is no
 * default, so the application refuses to start without one.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, Duration ttl, String issuer) {

  /** HS256 needs a key of at least 256 bits. */
  static final int MIN_SECRET_BYTES = 32;

  public JwtProperties {
    if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
      throw new IllegalStateException(
          "app.jwt.secret (JWT_SECRET) must be set and at least "
              + MIN_SECRET_BYTES
              + " bytes long");
    }
    if (ttl == null || ttl.isNegative() || ttl.isZero()) {
      throw new IllegalStateException("app.jwt.ttl must be a positive duration");
    }
    if (issuer == null || issuer.isBlank()) {
      throw new IllegalStateException("app.jwt.issuer must be set");
    }
  }
}
