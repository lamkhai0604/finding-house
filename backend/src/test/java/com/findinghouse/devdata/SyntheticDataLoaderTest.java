package com.findinghouse.devdata;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * T-203 under the dev profile, with its own database (a separate context from the other integration
 * tests, so their data and these 300 listings never mix).
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      IntegrationTest.TEST_JWT_SECRET_PROPERTY,
      "app.synthetic-data.listings=300",
      "app.synthetic-data.seed=7"
    })
@ActiveProfiles("dev")
@Import(TestcontainersConfiguration.class)
class SyntheticDataLoaderTest {

  @Value("${local.server.port}")
  int port;

  @Autowired SyntheticDataLoader loader;
  @Autowired JdbcTemplate jdbc;

  @Test
  void loadsTheTargetOnStartupAndIsIdempotent() {
    assertThat(loader.countSyntheticListings()).isEqualTo(300);
    assertThat(count("SELECT count(*) FROM users WHERE email LIKE '%@example.invalid'"))
        .isEqualTo(SyntheticDataLoader.LANDLORDS);

    assertThat(loader.load()).isZero();
    assertThat(loader.countSyntheticListings()).isEqualTo(300);
  }

  @Test
  void syntheticListingsAreBrowsableLikeRealOnes() {
    HttpResponse<String> response =
        new ApiClient(port).get("/api/v1/listings?size=50&sort=price_asc", null);

    assertThat(response.statusCode()).isEqualTo(200);
    int active = count("SELECT count(*) FROM listings WHERE status = 'ACTIVE'");
    assertThat(active).isBetween(250, 299);
    assertThat((Integer) JsonPath.read(response.body(), "$.totalItems")).isEqualTo(active);
    assertThat((String) JsonPath.read(response.body(), "$.items[0].description"))
        .startsWith(SyntheticListings.DESCRIPTION_PREFIX);
  }

  @Test
  void syntheticLandlordsCannotLogIn() {
    HttpResponse<String> response =
        new ApiClient(port)
            .post(
                "/api/v1/auth/login",
                "{\"email\":\"synthetic.landlord.01@example.invalid\",\"password\":\"anything-at-all\"}");

    assertThat(response.statusCode()).isEqualTo(401);
  }

  private int count(String sql) {
    Integer value = jdbc.queryForObject(sql, Integer.class);
    return value == null ? 0 : value;
  }
}
