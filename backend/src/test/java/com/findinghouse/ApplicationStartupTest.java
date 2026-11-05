package com.findinghouse;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpResponse;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * T-003 acceptance: the application starts against a real PostgreSQL, Flyway applies all
 * migrations, and the health endpoint reports UP without authentication.
 */
@IntegrationTest
class ApplicationStartupTest {

  @Value("${local.server.port}")
  int port;

  @Autowired Flyway flyway;

  @Test
  void flywayAppliesAllMigrations() {
    var info = flyway.info();

    assertThat(info.pending()).isEmpty();
    assertThat(info.current()).isNotNull();
    assertThat(info.current().getState().isApplied()).isTrue();
  }

  @Test
  void healthEndpointReportsUpWithoutAuthentication() {
    HttpResponse<String> response = new ApiClient(port).get("/actuator/health", null);

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.body()).contains("\"status\":\"UP\"");
  }
}
