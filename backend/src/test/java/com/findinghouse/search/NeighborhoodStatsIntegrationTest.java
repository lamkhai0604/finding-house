package com.findinghouse.search;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.findinghouse.listing.Market;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/**
 * T-210: room counts per neighborhood. The database is shared with other tests, so counts are
 * compared before and after; Georgetown is not used by any other test.
 */
@IntegrationTest
class NeighborhoodStatsIntegrationTest {

  private static final String HOOD = "Georgetown";

  @Value("${local.server.port}")
  int port;

  ApiClient api;
  String landlord;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
    landlord = new TestAccounts(api).landlord().token();
  }

  @Test
  void listsEveryNeighborhoodInMarketOrderWithoutLoggingIn() {
    HttpResponse<String> response = api.get("/api/v1/neighborhoods", null);

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<List<String>>read(response.body(), "$[*].neighborhood"))
        .containsExactlyElementsOf(Market.NEIGHBORHOODS);
  }

  @Test
  void countsOnlyShownRoomsAndReportsTheLowestRent() {
    long before = count();

    create(250_000);
    create(180_000);
    long hidden = create(100);
    api.patch("/api/v1/listings/" + hidden + "/status", "{\"status\":\"HIDDEN\"}", landlord);

    String body = api.get("/api/v1/neighborhoods", null).body();
    assertThat(count()).isEqualTo(before + 2);
    // The hidden room is the cheapest but must not set the lowest rent.
    assertThat(JsonPath.<List<Integer>>read(body, stat("lowestMonthlyPriceCents")).get(0))
        .isEqualTo(180_000);
  }

  private long count() {
    String body = api.get("/api/v1/neighborhoods", null).body();
    return JsonPath.<List<Integer>>read(body, stat("activeListings")).get(0).longValue();
  }

  private static String stat(String field) {
    return "$[?(@.neighborhood == '" + HOOD + "')]." + field;
  }

  private long create(long priceCents) {
    String body =
        """
        {"title":"Georgetown room","monthlyPriceCents":%d,"areaSqft":300,
         "neighborhood":"%s","address":"1 Sample St","amenities":[]}
        """
            .formatted(priceCents, HOOD);
    HttpResponse<String> response = api.post("/api/v1/listings", body, landlord);
    assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
    return JsonPath.<Integer>read(response.body(), "$.id").longValue();
  }
}
