package com.findinghouse.common;

import com.findinghouse.config.HttpProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * T-114a: rejects request bodies larger than {@code app.http.max-request-size} before they are read
 * (HTTP 413). The largest valid listing is about 13 KB, so the default of 64 KB leaves room. Bodies
 * without a declared length are still bounded by Tomcat's own limits.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestSizeLimitFilter extends OncePerRequestFilter {

  private static final String BODY =
      "{\"code\":\"PAYLOAD_TOO_LARGE\",\"message\":\"Request body is too"
          + " large\",\"fieldErrors\":[]}";

  private final long maxBytes;

  public RequestSizeLimitFilter(HttpProperties properties) {
    this.maxBytes = properties.maxRequestSize().toBytes();
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (request.getContentLengthLong() > maxBytes) {
      response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.getWriter().write(BODY);
      return;
    }
    chain.doFilter(request, response);
  }
}
