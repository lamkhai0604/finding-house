package com.findinghouse.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/** T-302 / T-304: with no key (the default), AI search says so and browse is unaffected. */
@IntegrationTest
class AiSearchOffIntegrationTest {

  @Value("${local.server.port}")
  int port;

  @Test
  void withoutAKeyAiSearchIsOffAndBrowseStillWorks() {
    ApiClient api = new ApiClient(port);

    assertThat(
            JsonPath.<Boolean>read(api.get("/api/v1/search/interpret", null).body(), "$.available"))
        .isFalse();
    HttpResponse<String> interpret =
        api.post("/api/v1/search/interpret", "{\"query\":\"room in ballard\"}");
    assertThat(interpret.statusCode()).isEqualTo(503);
    assertThat(JsonPath.<String>read(interpret.body(), "$.code")).isEqualTo("AI_UNAVAILABLE");
    assertThat(api.get("/api/v1/listings?neighborhood=Ballard", null).statusCode()).isEqualTo(200);
  }
}
