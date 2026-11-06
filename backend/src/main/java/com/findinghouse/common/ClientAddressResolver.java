package com.findinghouse.common;

import com.findinghouse.config.HttpProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * The address a request came from, for per-address limits (D-024, D-030).
 *
 * <p>By default this is the TCP peer. When {@code app.http.client-ip-header} is set, the value of
 * that header is used instead, but only if it is a single IP address; anything else (missing, a
 * list, a host name) falls back to the TCP peer. {@code X-Forwarded-For} is never read: on Render
 * it passes through whatever the client sent.
 */
@Component
public class ClientAddressResolver {

  private static final Pattern IPV4 =
      Pattern.compile(
          "^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$");
  private static final Pattern IPV6_CHARS = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

  private final String header;

  public ClientAddressResolver(HttpProperties properties) {
    this.header = properties.clientIpHeader();
  }

  public String resolve(HttpServletRequest request) {
    if (!header.isEmpty()) {
      String value = request.getHeader(header);
      if (value != null && isIpAddress(value.strip())) {
        return value.strip();
      }
    }
    return request.getRemoteAddr();
  }

  static boolean isIpAddress(String value) {
    if (IPV4.matcher(value).matches()) {
      return true;
    }
    // A colon makes InetAddress parse an IPv6 literal without any DNS lookup.
    if (!value.contains(":") || !IPV6_CHARS.matcher(value).matches()) {
      return false;
    }
    try {
      InetAddress.getByName("[" + value + "]");
      return true;
    } catch (UnknownHostException | IllegalArgumentException e) {
      return false;
    }
  }
}
