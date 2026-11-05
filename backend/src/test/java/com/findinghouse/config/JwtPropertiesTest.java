package com.findinghouse.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;

/** The application must refuse to start with a missing or weak JWT secret (CODE-08). */
class JwtPropertiesTest {

  private static final Duration DAY = Duration.ofHours(24);

  @Test
  void rejectsMissingSecret() {
    assertThatThrownBy(() -> new JwtProperties(null, DAY, "finding-house"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("JWT_SECRET");
  }

  @Test
  void rejectsSecretShorterThan32Bytes() {
    assertThatThrownBy(() -> new JwtProperties("CHANGE_ME", DAY, "finding-house"))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void rejectsNonPositiveTtl() {
    assertThatThrownBy(() -> new JwtProperties("x".repeat(32), Duration.ZERO, "finding-house"))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void acceptsValidSettings() {
    assertThatCode(() -> new JwtProperties("x".repeat(32), DAY, "finding-house"))
        .doesNotThrowAnyException();
  }
}
