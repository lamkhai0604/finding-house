package com.findinghouse.search;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManagerFactory;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * FR-03 acceptance criteria over HTTP. The database is shared with other tests, so each test
 * creates listings in its own price band (5,000,000+ cents, unused elsewhere) and filters by it.
 */
@IntegrationTest
class SearchIntegrationTest {

  private static final AtomicLong NEXT_BAND = new AtomicLong(5_000_000);

  @Value("${local.server.port}")
  int port;

  @Autowired EntityManagerFactory entityManagerFactory;

  ApiClient api;
  String landlord;
  long band;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
    landlord = new TestAccounts(api).landlord().token();
    band = NEXT_BAND.getAndAdd(1_000);
  }

  // --- AC1: only active listings ---------------------------------------------------------------

  @Test
  void hiddenListingsAreNotBrowsable() {
    long visible = create("Visible room", band + 10, 300, "Ballard", List.of());
    long hidden = create("Hidden room", band + 20, 300, "Ballard", List.of());
    api.patch("/api/v1/listings/" + hidden + "/status", "{\"status\":\"HIDDEN\"}", landlord);

    HttpResponse<String> response = browse(inBand());

    assertThat(ids(response)).containsExactly(visible);
  }

  // --- AC2: filters, combinable ----------------------------------------------------------------

  @Test
  void priceRangeIsInclusive() {
    create("Too cheap", band + 1, 300, "Ballard", List.of());
    long low = create("Low edge", band + 10, 300, "Ballard", List.of());
    long high = create("High edge", band + 20, 300, "Ballard", List.of());
    create("Too dear", band + 30, 300, "Ballard", List.of());

    HttpResponse<String> response =
        browse(
            "minPriceCents=" + (band + 10) + "&maxPriceCents=" + (band + 20) + "&sort=price_asc");

    assertThat(ids(response)).containsExactly(low, high);
  }

  @Test
  void filtersByNeighborhoodIgnoringCase() {
    long fremont = create("Fremont room", band + 10, 300, "Fremont", List.of());
    create("Ballard room", band + 20, 300, "Ballard", List.of());

    assertThat(ids(browse(inBand() + "&neighborhood=fremont"))).containsExactly(fremont);
  }

  @Test
  void filtersByMinimumArea() {
    create("Small", band + 10, 150, "Ballard", List.of());
    long large = create("Large", band + 20, 600, "Ballard", List.of());

    assertThat(ids(browse(inBand() + "&minAreaSqft=600"))).containsExactly(large);
  }

  @Test
  void listingMustHaveEverySelectedAmenity() {
    create("Wifi only", band + 10, 300, "Ballard", List.of("WIFI"));
    long both = create("Wifi and kitchen", band + 20, 300, "Ballard", List.of("WIFI", "KITCHEN"));
    long all =
        create("Everything", band + 30, 300, "Ballard", List.of("WIFI", "KITCHEN", "PARKING"));

    HttpResponse<String> repeated = browse(inBand() + "&amenities=WIFI&amenities=kitchen");
    HttpResponse<String> commaSeparated = browse(inBand() + "&amenities=WIFI,KITCHEN");

    assertThat(ids(repeated)).containsExactlyInAnyOrder(both, all);
    assertThat(ids(commaSeparated)).containsExactlyInAnyOrder(both, all);
  }

  @Test
  void filtersCombine() {
    create("Right place, too small", band + 10, 100, "Fremont", List.of("WIFI"));
    create("Right size, wrong place", band + 20, 500, "Ballard", List.of("WIFI"));
    long match = create("Match", band + 30, 500, "Fremont", List.of("WIFI", "KITCHEN"));

    HttpResponse<String> response =
        browse(inBand() + "&neighborhood=Fremont&minAreaSqft=400&amenities=WIFI");

    assertThat(ids(response)).containsExactly(match);
  }

  // --- AC3: sorting ----------------------------------------------------------------------------

  @Test
  void sortsNewestFirstByDefaultAndByPriceOnRequest() {
    long middle = create("Middle", band + 20, 300, "Ballard", List.of());
    long cheap = create("Cheap", band + 10, 300, "Ballard", List.of());
    long dear = create("Expensive", band + 30, 300, "Ballard", List.of());

    assertThat(ids(browse(inBand()))).containsExactly(dear, cheap, middle);
    assertThat(ids(browse(inBand() + "&sort=price_asc"))).containsExactly(cheap, middle, dear);
    assertThat(ids(browse(inBand() + "&sort=PRICE_DESC"))).containsExactly(dear, middle, cheap);
  }

  // --- AC4: pagination -------------------------------------------------------------------------

  @Test
  void paginatesWithTotals() {
    for (int i = 0; i < 5; i++) {
      create("Room " + i, band + i, 300, "Ballard", List.of());
    }

    HttpResponse<String> second = browse(inBand() + "&sort=price_asc&size=2&page=1");

    assertThat(second.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<Integer>read(second.body(), "$.page")).isEqualTo(1);
    assertThat(JsonPath.<Integer>read(second.body(), "$.size")).isEqualTo(2);
    assertThat(JsonPath.<Integer>read(second.body(), "$.totalItems")).isEqualTo(5);
    assertThat(JsonPath.<Integer>read(second.body(), "$.totalPages")).isEqualTo(3);
    assertThat(JsonPath.<List<String>>read(second.body(), "$.items[*].title"))
        .containsExactly("Room 2", "Room 3");
  }

  @Test
  void defaultPageSizeIs20() {
    HttpResponse<String> response = browse("");

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<Integer>read(response.body(), "$.size")).isEqualTo(20);
  }

  @Test
  void aPageOfResultsDoesNotQueryOncePerListing() {
    for (int i = 0; i < 12; i++) {
      create("Batch " + i, band + i, 300, "Ballard", List.of("WIFI", "KITCHEN"));
    }
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    statistics.clear();

    HttpResponse<String> response = browse(inBand());

    assertThat(ids(response)).hasSize(12);
    // listings + count + amenities batch + images batch; 12 listings must not mean 24+ queries.
    assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(5);
  }

  // --- AC5: invalid filters --------------------------------------------------------------------

  @Test
  void rejectsInvalidFiltersWithFieldErrors() {
    assertFieldError("minPriceCents=500&maxPriceCents=100", "minPriceCents");
    assertFieldError("amenities=HOT_TUB", "amenities");
    assertFieldError("neighborhood=Gotham", "neighborhood");
    assertFieldError("sort=cheapest", "sort");
    assertFieldError("size=0", "size");
    assertFieldError("size=51", "size");
    assertFieldError("page=-1", "page");
    assertFieldError("minAreaSqft=-5", "minAreaSqft");
    assertFieldError("minPriceCents=abc", "minPriceCents");
  }

  @Test
  void browsingIsPublic() {
    assertThat(api.get("/api/v1/listings", null).statusCode()).isEqualTo(200);
  }

  // --- helpers --------------------------------------------------------------------------------

  private String inBand() {
    return "minPriceCents=" + band + "&maxPriceCents=" + (band + 999);
  }

  private HttpResponse<String> browse(String query) {
    return api.get("/api/v1/listings" + (query.isEmpty() ? "" : "?" + query), null);
  }

  private void assertFieldError(String query, String field) {
    HttpResponse<String> response = browse(query);
    assertThat(response.statusCode()).as(query).isEqualTo(400);
    assertThat(JsonPath.<List<String>>read(response.body(), "$.fieldErrors[*].field"))
        .as(query)
        .containsExactly(field);
  }

  private static List<Long> ids(HttpResponse<String> response) {
    assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
    List<Integer> ids = JsonPath.read(response.body(), "$.items[*].id");
    return ids.stream().map(Integer::longValue).toList();
  }

  private long create(
      String title, long priceCents, int areaSqft, String neighborhood, List<String> amenities) {
    String amenityJson =
        amenities.stream().map(a -> "\"" + a + "\"").reduce((a, b) -> a + "," + b).orElse("");
    String body =
        """
        {"title":"%s","monthlyPriceCents":%d,"areaSqft":%d,"neighborhood":"%s",
         "address":"1 Sample St","amenities":[%s]}
        """
            .formatted(title, priceCents, areaSqft, neighborhood, amenityJson);
    HttpResponse<String> response = api.post("/api/v1/listings", body, landlord);
    assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
    return JsonPath.<Integer>read(response.body(), "$.id").longValue();
  }
}
