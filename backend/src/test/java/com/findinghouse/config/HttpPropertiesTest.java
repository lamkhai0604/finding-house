package com.findinghouse.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.util.unit.DataSize;

class HttpPropertiesTest {

  private static HttpProperties withOrigins(String... origins) {
    return new HttpProperties("", List.of(origins), DataSize.ofKilobytes(64));
  }

  @Test
  void acceptsExactHttpsOriginsAndLocalhost() {
    assertThat(
            withOrigins("https://finding-house.vercel.app", " http://localhost:4173 ", "")
                .corsAllowedOrigins())
        .containsExactly("https://finding-house.vercel.app", "http://localhost:4173");
  }

  @Test
  void refusesWildcardsPathsAndPlainHttp() {
    for (String origin :
        List.of(
            "*",
            "https://*.vercel.app",
            "https://finding-house.vercel.app/",
            "https://finding-house.vercel.app/app",
            "http://finding-house.example.com",
            "finding-house.vercel.app")) {
      assertThatThrownBy(() -> withOrigins(origin))
          .as(origin)
          .isInstanceOf(IllegalStateException.class);
    }
  }

  @Test
  void refusesATinyBodyLimit() {
    assertThatThrownBy(() -> new HttpProperties("", List.of(), DataSize.ofBytes(10)))
        .isInstanceOf(IllegalStateException.class);
  }
}
