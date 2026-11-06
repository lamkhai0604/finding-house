package com.findinghouse.search;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestcontainersConfiguration;
import com.findinghouse.devdata.SyntheticDataLoader;
import com.findinghouse.listing.Amenity;
import com.findinghouse.listing.Market;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * T-204 / NFR-02: browse response time with 10,000 synthetic listings (T-203) in PostgreSQL 16,
 * measured over HTTP against the running application. Prints the latency table and the query plans
 * to the build log as evidence, and fails if p95 reaches 500 ms.
 *
 * <p>Uses its own application context and database, so the other tests' data is not involved.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      IntegrationTest.TEST_JWT_SECRET_PROPERTY,
      "app.synthetic-data.listings=10000",
      "app.synthetic-data.seed=42"
    })
@ActiveProfiles("dev")
@Import(TestcontainersConfiguration.class)
class BrowsePerformanceTest {

  private static final int WARM_UP = 40;
  private static final int MEASURED = 400;
  private static final long P95_LIMIT_MS = 500;

  @Value("${local.server.port}")
  int port;

  @Autowired SyntheticDataLoader loader;
  @Autowired JdbcTemplate jdbc;

  record Sample(String kind, double millis) {}

  @Test
  void browseP95IsUnder500MsWithTenThousandListings() {
    assertThat(loader.countSyntheticListings()).isEqualTo(10_000);
    ApiClient api = new ApiClient(port);
    Random random = new Random(2026);

    for (int i = 0; i < WARM_UP; i++) {
      api.get(randomQuery(random).getValue(), null);
    }

    List<Sample> samples = new ArrayList<>();
    for (int i = 0; i < MEASURED; i++) {
      Map.Entry<String, String> query = randomQuery(random);
      long start = System.nanoTime();
      HttpResponse<String> response = api.get(query.getValue(), null);
      double millis = (System.nanoTime() - start) / 1_000_000.0;
      assertThat(response.statusCode()).as(query.getValue()).isEqualTo(200);
      samples.add(new Sample(query.getKey(), millis));
    }

    StringBuilder report = new StringBuilder("\nNFR-02 browse latency, 10,000 listings\n");
    report.append(
        String.format("%-22s %5s %8s %8s %8s%n", "query", "n", "p50 ms", "p95 ms", "max ms"));
    Map<String, List<Double>> byKind = new LinkedHashMap<>();
    for (Sample s : samples) {
      byKind.computeIfAbsent(s.kind(), k -> new ArrayList<>()).add(s.millis());
    }
    byKind.forEach((kind, values) -> report.append(row(kind, values)));
    List<Double> all = samples.stream().map(Sample::millis).toList();
    report.append(row("ALL", all));
    System.out.println(report);

    printPlans();

    assertThat(percentile(all, 95)).as("p95 over all queries (ms)").isLessThan(P95_LIMIT_MS);
  }

  /** A realistic mix of what the browse page sends. */
  private static Map.Entry<String, String> randomQuery(Random random) {
    String neighborhood =
        Market.NEIGHBORHOODS.get(random.nextInt(Market.NEIGHBORHOODS.size())).replace(" ", "+");
    long min = 50_000L + random.nextInt(20) * 10_000L;
    long max = min + 50_000L + random.nextInt(15) * 10_000L;
    Amenity a = Amenity.values()[random.nextInt(Amenity.values().length)];
    Amenity b = Amenity.values()[random.nextInt(Amenity.values().length)];
    String base = "/api/v1/listings?size=12";
    return switch (random.nextInt(8)) {
      case 0 -> Map.entry("newest", base);
      case 1 -> Map.entry("neighborhood", base + "&neighborhood=" + neighborhood);
      case 2 -> Map.entry("price range", base + "&minPriceCents=" + min + "&maxPriceCents=" + max);
      case 3 -> Map.entry("two amenities", base + "&amenities=" + a + "&amenities=" + b);
      case 4 ->
          Map.entry(
              "combined",
              base
                  + "&neighborhood="
                  + neighborhood
                  + "&maxPriceCents="
                  + max
                  + "&minAreaSqft=200&amenities="
                  + a);
      case 5 -> Map.entry("price sort", base + "&sort=price_asc&minPriceCents=" + min);
      case 6 -> Map.entry("deep page", base + "&page=" + (300 + random.nextInt(400)));
      default -> Map.entry("50 per page", "/api/v1/listings?size=50&sort=price_desc");
    };
  }

  private static String row(String kind, List<Double> values) {
    return String.format(
        "%-22s %5d %8.1f %8.1f %8.1f%n",
        kind,
        values.size(),
        percentile(values, 50),
        percentile(values, 95),
        values.stream().mapToDouble(Double::doubleValue).max().orElse(0));
  }

  /** Nearest-rank percentile. */
  static double percentile(List<Double> values, int p) {
    List<Double> sorted = values.stream().sorted().toList();
    int rank = (int) Math.ceil(p / 100.0 * sorted.size());
    return sorted.get(Math.max(0, rank - 1));
  }

  /** Query plans for the slowest shapes, so index decisions rest on evidence (CODE-15). */
  private void printPlans() {
    jdbc.execute("ANALYZE");
    Map<String, String> shapes = new LinkedHashMap<>();
    shapes.put(
        "newest page",
        "SELECT id FROM listings WHERE status = 'ACTIVE'"
            + " ORDER BY created_at DESC, id DESC LIMIT 12");
    shapes.put(
        "deep page",
        "SELECT id FROM listings WHERE status = 'ACTIVE'"
            + " ORDER BY created_at DESC, id DESC OFFSET 6000 LIMIT 12");
    shapes.put("count all", "SELECT count(id) FROM listings WHERE status = 'ACTIVE'");
    shapes.put(
        "combined filter",
        "SELECT l.id FROM listings l WHERE l.status = 'ACTIVE' AND l.neighborhood = 'Ballard'"
            + " AND l.monthly_price_cents <= 200000 AND l.area_sqft >= 200"
            + " AND 'WIFI' IN (SELECT a.amenity FROM listing_amenities a WHERE a.listing_id = l.id)"
            + " ORDER BY l.created_at DESC, l.id DESC LIMIT 12");
    StringBuilder plans = new StringBuilder("\nNFR-02 query plans (EXPLAIN ANALYZE)\n");
    shapes.forEach(
        (name, sql) -> {
          plans.append("-- ").append(name).append('\n');
          jdbc.queryForList("EXPLAIN (ANALYZE, COSTS OFF) " + sql, String.class)
              .forEach(line -> plans.append("   ").append(line).append('\n'));
        });
    System.out.println(plans);
  }
}
