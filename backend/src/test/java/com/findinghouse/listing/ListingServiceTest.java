package com.findinghouse.listing;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Unit tests for the image-link rule (FR-02 AC2), without HTTP or a database. */
class ListingServiceTest {

  @ParameterizedTest
  @ValueSource(
      strings = {
        "https://example.com/a.jpg",
        "HTTPS://EXAMPLE.COM/A.JPG",
        "https://cdn.example.com/path/img.png?w=800"
      })
  void acceptsAbsoluteHttpsLinks(String url) {
    assertThat(ListingService.isHttpsUrl(url)).isTrue();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "http://example.com/a.jpg",
        "javascript:alert(1)",
        "data:image/png;base64,AAAA",
        "/relative.jpg",
        "https://",
        "https:///no-host.jpg",
        "not a url at all",
        "ftp://example.com/a.jpg"
      })
  void rejectsEverythingElse(String url) {
    assertThat(ListingService.isHttpsUrl(url)).isFalse();
  }
}
