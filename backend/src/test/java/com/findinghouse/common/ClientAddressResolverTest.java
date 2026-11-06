package com.findinghouse.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.config.HttpProperties;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.util.unit.DataSize;

class ClientAddressResolverTest {

  private static ClientAddressResolver resolver(String header) {
    return new ClientAddressResolver(
        new HttpProperties(header, List.of(), DataSize.ofKilobytes(64)));
  }

  private static MockHttpServletRequest request(String headerName, String headerValue) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr("10.0.0.5");
    if (headerName != null) {
      request.addHeader(headerName, headerValue);
    }
    return request;
  }

  @Test
  void usesTheTcpPeerWhenNoHeaderIsConfigured() {
    assertThat(resolver("").resolve(request("CF-Connecting-IP", "203.0.113.7")))
        .isEqualTo("10.0.0.5");
  }

  @Test
  void usesTheConfiguredHeaderForASingleAddress() {
    ClientAddressResolver resolver = resolver("CF-Connecting-IP");

    assertThat(resolver.resolve(request("CF-Connecting-IP", "203.0.113.7")))
        .isEqualTo("203.0.113.7");
    assertThat(resolver.resolve(request("CF-Connecting-IP", " 2001:db8::1 ")))
        .isEqualTo("2001:db8::1");
  }

  @Test
  void neverReadsXForwardedFor() {
    assertThat(resolver("CF-Connecting-IP").resolve(request("X-Forwarded-For", "203.0.113.9")))
        .isEqualTo("10.0.0.5");
  }

  @Test
  void fallsBackToTheTcpPeerForAnythingThatIsNotOneAddress() {
    ClientAddressResolver resolver = resolver("CF-Connecting-IP");
    for (String value :
        List.of("", "evil", "203.0.113.7, 10.0.0.1", "256.1.1.1", "example.com", "1.2.3", "::g")) {
      assertThat(resolver.resolve(request("CF-Connecting-IP", value)))
          .as(value)
          .isEqualTo("10.0.0.5");
    }
  }
}
