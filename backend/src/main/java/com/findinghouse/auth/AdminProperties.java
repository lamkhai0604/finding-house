package com.findinghouse.auth;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * D-036: e-mail addresses of existing tenant accounts to promote to administrator at startup. Set
 * only on the host ({@code ADMIN_EMAILS}, comma-separated); empty means no promotion.
 */
@ConfigurationProperties(prefix = "app.admin")
public record AdminProperties(List<String> emails) {

  public AdminProperties {
    emails = emails == null ? List.of() : emails.stream().filter(e -> !e.isBlank()).toList();
  }
}
