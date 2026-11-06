package com.findinghouse;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.devdata.SyntheticDataLoader;
import java.net.http.HttpResponse;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;

/**
 * T-003 acceptance: the application starts against a real PostgreSQL, Flyway applies all
 * migrations, and the health endpoint reports UP without authentication.
 */
@IntegrationTest
class ApplicationStartupTest {

  @Value("${local.server.port}")
  int port;

  @Autowired Flyway flyway;
  @Autowired ApplicationContext context;

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

  @Test
  void syntheticDataLoaderOnlyExistsUnderTheDevProfile() {
    // T-203 (D-028): outside "dev" there is no way to load fake listings.
    assertThat(context.getBeanProvider(SyntheticDataLoader.class).getIfAvailable()).isNull();
  }
}
