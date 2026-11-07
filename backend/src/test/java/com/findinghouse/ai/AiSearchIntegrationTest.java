package com.findinghouse.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.IntegrationTest;
import com.findinghouse.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * T-302 / T-304 (FR-05, NFR-04): {@code /api/v1/search/interpret} over HTTP, with the AI provider
 * replaced by a fake on localhost. Each test sends its own client address (CF-Connecting-IP, as on
 * Render) so the per-address limit of one test does not affect another.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      IntegrationTest.TEST_JWT_SECRET_PROPERTY,
      "app.http.client-ip-header=CF-Connecting-IP",
      "app.ai.model=test-model",
      "app.ai.api-key=test-key",
      "app.ai.timeout=1s",
      "app.ai.limits.per-address-per-hour=3",
      "app.ai.limits.per-minute=1000",
      "app.ai.limits.per-day=1000"
    })
@Import(TestcontainersConfiguration.class)
class AiSearchIntegrationTest {

  static final FakeAiServer FAKE = startFake();

  static FakeAiServer startFake() {
    try {
      return new FakeAiServer();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  @DynamicPropertySource
  static void aiProvider(DynamicPropertyRegistry registry) {
    registry.add("app.ai.base-url", FAKE::baseUrl);
  }

  @AfterAll
  static void stopFake() {
    FAKE.close();
  }

  @Value("${local.server.port}")
  int port;

  final HttpClient http = HttpClient.newHttpClient();

  private HttpResponse<String> interpret(String address, String query) {
    String body = query == null ? "{}" : "{\"query\":\"" + query + "\"}";
    return send(
        HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/search/interpret"))
            .header("Content-Type", "application/json")
            .header("CF-Connecting-IP", address)
            .POST(HttpRequest.BodyPublishers.ofString(body)));
  }

  private HttpResponse<String> send(HttpRequest.Builder request) {
    try {
      return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(e);
    }
  }

  private static final AtomicInteger NEXT_ADDRESS = new AtomicInteger(1);

  /** A different documentation-range IPv4 address for each call (the resolver wants a real IP). */
  private static String newAddress() {
    return "198.51.100." + NEXT_ADDRESS.getAndIncrement();
  }

  private static String reply(String json) {
    return json;
  }

  @Test
  void saysItIsAvailableWithoutLoggingIn() {
    HttpResponse<String> response =
        send(
            HttpRequest.newBuilder(
                    URI.create("http://localhost:" + port + "/api/v1/search/interpret"))
                .GET());

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<Boolean>read(response.body(), "$.available")).isTrue();
  }

  @Test
  void turnsASentenceIntoValidatedBrowseFilters() {
    FAKE.delay(0)
        .replyWithContent(
            reply(
                """
                {"understood":true,"neighborhood":"capitol hill","minMonthlyRent":null,\
                "maxMonthlyRent":1300.5,"minAreaSqft":150,\
                "amenities":["WASHING_MACHINE","WIFI","WASHING_MACHINE"]}\
                """));

    HttpResponse<String> response =
        interpret(newAddress(), "quiet room in cap hill under 1300 with laundry and wifi");

    assertThat(response.statusCode()).isEqualTo(200);
    String body = response.body();
    assertThat(JsonPath.<Boolean>read(body, "$.understood")).isTrue();
    assertThat(JsonPath.<String>read(body, "$.filters.neighborhood")).isEqualTo("Capitol Hill");
    assertThat(JsonPath.<Object>read(body, "$.filters.minPriceCents")).isNull();
    assertThat(JsonPath.<Integer>read(body, "$.filters.maxPriceCents")).isEqualTo(130050);
    assertThat(JsonPath.<Integer>read(body, "$.filters.minAreaSqft")).isEqualTo(150);
    assertThat(JsonPath.<List<String>>read(body, "$.filters.amenities"))
        .containsExactly("WASHING_MACHINE", "WIFI");
    assertThat(JsonPath.<List<String>>read(body, "$.notes")).isEmpty();
  }

  @Test
  void dropsWhatTheModelGotWrongAndSaysSo() {
    FAKE.delay(0)
        .replyWithContent(
            reply(
                """
                {"understood":true,"neighborhood":"Bellevue","minMonthlyRent":1500,\
                "maxMonthlyRent":900,"minAreaSqft":-4,"amenities":["POOL","KITCHEN"]}\
                """));

    String body = interpret(newAddress(), "cheap room").body();

    assertThat(JsonPath.<Object>read(body, "$.filters.neighborhood")).isNull();
    assertThat(JsonPath.<Integer>read(body, "$.filters.minPriceCents")).isEqualTo(90000);
    assertThat(JsonPath.<Integer>read(body, "$.filters.maxPriceCents")).isEqualTo(150000);
    assertThat(JsonPath.<Object>read(body, "$.filters.minAreaSqft")).isNull();
    assertThat(JsonPath.<List<String>>read(body, "$.filters.amenities")).containsExactly("KITCHEN");
    assertThat(JsonPath.<List<String>>read(body, "$.notes"))
        .containsExactly(
            "Left out a neighborhood we do not cover.",
            "Put the lower rent first.",
            "Left out a room size we could not use.",
            "Left out an amenity we do not list.");
  }

  @Test
  void textThatIsNotARoomSearchComesBackNotUnderstood() {
    FAKE.delay(0)
        .replyWithContent(
            reply(
                """
                {"understood":false,"neighborhood":null,"minMonthlyRent":null,\
                "maxMonthlyRent":null,"minAreaSqft":null,"amenities":[]}\
                """));

    String body = interpret(newAddress(), "tell me a joke").body();

    assertThat(JsonPath.<Boolean>read(body, "$.understood")).isFalse();
    assertThat(JsonPath.<Object>read(body, "$.filters.neighborhood")).isNull();
    assertThat(JsonPath.<List<String>>read(body, "$.filters.amenities")).isEmpty();
  }

  @Test
  void rejectsEmptyAndTooLongQueriesWithoutCallingTheProvider() {
    int before = FAKE.requestCount();

    assertThat(interpret(newAddress(), " ").statusCode()).isEqualTo(400);
    assertThat(interpret(newAddress(), null).statusCode()).isEqualTo(400);
    assertThat(interpret(newAddress(), "x".repeat(201)).statusCode()).isEqualTo(400);
    assertThat(FAKE.requestCount()).isEqualTo(before);
  }

  @Test
  void limitsSearchesPerAddressAndSaysTheFiltersStillWork() {
    FAKE.delay(0)
        .replyWithContent(
            reply(
                """
                {"understood":true,"neighborhood":"Ballard","minMonthlyRent":null,\
                "maxMonthlyRent":null,"minAreaSqft":null,"amenities":[]}\
                """));
    String address = newAddress();
    for (int i = 0; i < 3; i++) {
      assertThat(interpret(address, "room in ballard").statusCode()).isEqualTo(200);
    }

    HttpResponse<String> limited = interpret(address, "room in ballard");

    assertThat(limited.statusCode()).isEqualTo(429);
    assertThat(limited.headers().firstValue("Retry-After")).isPresent();
    assertThat(JsonPath.<String>read(limited.body(), "$.message")).contains("filters still work");
    // Another visitor is not affected.
    assertThat(interpret(newAddress(), "room in ballard").statusCode()).isEqualTo(200);
  }

  // --- T-304: every failure answers quickly with a code the UI can explain ---------------------

  @Test
  void providerFailuresBecomeClearErrors() {
    record Case(Runnable setup, int status, String code) {}
    List<Case> cases =
        List.of(
            new Case(() -> FAKE.delay(2000).replyWithContent("{}"), 504, "AI_TIMEOUT"),
            new Case(() -> FAKE.delay(0).reply(429, "{}"), 429, "AI_BUSY"),
            new Case(() -> FAKE.delay(0).reply(503, "{}"), 502, "AI_FAILED"),
            new Case(() -> FAKE.delay(0).reply(200, "<html>"), 502, "AI_FAILED"),
            new Case(() -> FAKE.delay(0).replyWithContent("not json"), 502, "AI_FAILED"),
            new Case(
                () -> FAKE.delay(0).replyWithContent("{\"neighborhood\":\"Ballard\"}"),
                502,
                "AI_FAILED"));
    for (Case c : cases) {
      c.setup().run();
      HttpResponse<String> response = interpret(newAddress(), "room in ballard");
      assertThat(response.statusCode()).as(c.code()).isEqualTo(c.status());
      assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo(c.code());
      assertThat(JsonPath.<String>read(response.body(), "$.message")).doesNotContain("ballard");
    }
    FAKE.delay(0);
  }
}
