package com.findinghouse.auth;

import java.util.Collection;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * D-036: promotes the accounts listed in {@code ADMIN_EMAILS} when the application starts. Only
 * tenant accounts are promoted (a landlord keeps their listings and phone); the log says how many,
 * never which addresses. There is no demotion here: that is a deliberate manual step.
 */
@Component
@EnableConfigurationProperties(AdminProperties.class)
public class AdminPromotion {

  private static final Logger log = LoggerFactory.getLogger(AdminPromotion.class);

  private final UserAccountRepository users;
  private final AdminProperties properties;

  public AdminPromotion(UserAccountRepository users, AdminProperties properties) {
    this.users = users;
    this.properties = properties;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void promoteConfigured() {
    if (properties.emails().isEmpty()) {
      return;
    }
    Result result = promote(properties.emails());
    log.info(
        "Administrators from ADMIN_EMAILS: {} promoted, {} already admin, {} skipped (not a tenant"
            + " account), {} not found",
        result.promoted(),
        result.alreadyAdmin(),
        result.skipped(),
        result.notFound());
  }

  @Transactional
  public Result promote(Collection<String> emails) {
    int promoted = 0;
    int alreadyAdmin = 0;
    int skipped = 0;
    int notFound = 0;
    for (String raw : emails) {
      String email = raw.trim().toLowerCase(Locale.ROOT);
      UserAccount user = users.findByEmail(email).orElse(null);
      if (user == null) {
        notFound++;
      } else if (user.getRole() == Role.ADMIN) {
        alreadyAdmin++;
      } else if (user.getRole() != Role.TENANT) {
        skipped++;
      } else {
        user.promoteToAdmin();
        promoted++;
      }
    }
    return new Result(promoted, alreadyAdmin, skipped, notFound);
  }

  public record Result(int promoted, int alreadyAdmin, int skipped, int notFound) {}
}
