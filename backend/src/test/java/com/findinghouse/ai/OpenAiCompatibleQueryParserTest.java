package com.findinghouse.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** T-301 (FR-05): the provider adapter against a fake OpenAI-compatible server. */
class OpenAiCompatibleQueryParserTest {

  private static final String QUERY = "quiet room in cap hill under $1,300 with laundry";

  FakeAiServer fake;
  QueryParser parser;

  @BeforeEach
  void setUp() throws Exception {
    fake = new FakeAiServer();
    parser = parserWithTimeout(Duration.ofSeconds(2));
  }

  @AfterEach
  void tearDown() {
    fake.close();
  }

  private QueryParser parserWithTimeout(Duration timeout) {
    return new OpenAiCompatibleQueryParser(
        new AiProperties(fake.baseUrl(), "test-model", "test-key", timeout));
  }

  @Test
  void sendsOnlyTheQueryWithAStrictSchemaOfKnownValues() {
    fake.replyWithContent(
        """
        {"understood":true,"neighborhood":null,"minMonthlyRent":null,"maxMonthlyRent":null,\
        "minAreaSqft":null,"amenities":[]}\
        """);

    parser.parse(QUERY);

    assertThat(fake.lastPath).isEqualTo("/v1/chat/completions");
    assertThat(fake.lastAuthorization).isEqualTo("Bearer test-key");
    String body = fake.lastBody;
    assertThat(JsonPath.<String>read(body, "$.model")).isEqualTo("test-model");
    assertThat(JsonPath.<Integer>read(body, "$.temperature")).isZero();
    assertThat(JsonPath.<List<String>>read(body, "$.messages[*].role"))
        .containsExactly("system", "user");
    // The sentence is the only thing from the user; nothing else is in the request.
    assertThat(JsonPath.<String>read(body, "$.messages[1].content")).isEqualTo(QUERY);
    assertThat(JsonPath.<Map<String, Object>>read(body, "$").keySet())
        .containsExactly("model", "temperature", "max_tokens", "messages", "response_format");
    assertThat(JsonPath.<Integer>read(body, "$.max_tokens"))
        .isEqualTo(AiProperties.DEFAULT_MAX_TOKENS);
    assertThat(JsonPath.<Boolean>read(body, "$.response_format.json_schema.strict")).isTrue();
    String schema = "$.response_format.json_schema.schema";
    assertThat(JsonPath.<Boolean>read(body, schema + ".additionalProperties")).isFalse();
    assertThat(JsonPath.<List<Object>>read(body, schema + ".properties.neighborhood.enum"))
        .contains("Capitol Hill", "University District")
        .containsNull()
        .doesNotContain("Bellevue");
    assertThat(JsonPath.<List<String>>read(body, schema + ".properties.amenities.items.enum"))
        .contains("WASHING_MACHINE", "PETS_ALLOWED");
    assertThat(JsonPath.<List<String>>read(body, schema + ".required"))
        .containsExactlyInAnyOrder(
            "understood",
            "neighborhood",
            "minMonthlyRent",
            "maxMonthlyRent",
            "minAreaSqft",
            "amenities");
  }

  @Test
  void sendsTheReasoningEffortAndTokenLimitWhenConfigured() {
    fake.replyWithContent(
        """
        {"understood":false,"neighborhood":null,"minMonthlyRent":null,"maxMonthlyRent":null,\
        "minAreaSqft":null,"amenities":[]}\
        """);
    QueryParser tuned =
        new OpenAiCompatibleQueryParser(
            new AiProperties(
                fake.baseUrl(), "openai/gpt-oss-20b", "k", Duration.ofSeconds(2), 2048, " LOW "));

    tuned.parse(QUERY);

    assertThat(JsonPath.<String>read(fake.lastBody, "$.reasoning_effort")).isEqualTo("low");
    assertThat(JsonPath.<Integer>read(fake.lastBody, "$.max_tokens")).isEqualTo(2048);
  }

  @Test
  void aReplyCutOffAtTheTokenLimitIsAFailureNotAnEmptySearch() {
    // T-306: a reasoning model that spends the budget on reasoning stops with finish_reason
    // "length" and no JSON; that must be reported as such, not read as filters.
    fake.reply(
        200,
        """
        {"id":"x","object":"chat.completion","choices":[{"index":0,"message":\
        {"role":"assistant","content":""},"finish_reason":"length"}]}\
        """);

    assertThatThrownBy(() -> parser.parse(QUERY))
        .isInstanceOfSatisfying(
            AiException.class, e -> assertThat(e.kind()).isEqualTo(AiException.Kind.FAILED))
        .hasMessageContaining("token limit");
  }

  @Test
  void rejectsUnknownReasoningEffortAndOutOfRangeTokenLimits() {
    assertThatThrownBy(
            () -> new AiProperties("https://x.example/v1", "m", "k", null, null, "extreme"))
        .isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(() -> new AiProperties("https://x.example/v1", "m", "k", null, 10, null))
        .isInstanceOf(IllegalStateException.class);
    assertThat(new AiProperties("https://x.example/v1", "m", "k", null).reasoningEffort())
        .isEmpty();
  }

  @Test
  void readsTheFiltersFromAGoodReply() {
    fake.replyWithContent(
        """
        {"understood":true,"neighborhood":"Capitol Hill","minMonthlyRent":null,\
        "maxMonthlyRent":1300,"minAreaSqft":150,"amenities":["WASHING_MACHINE"]}\
        """);

    ParsedQuery parsed = parser.parse(QUERY);

    assertThat(parsed)
        .isEqualTo(
            new ParsedQuery(true, "Capitol Hill", null, 1300.0, 150, List.of("WASHING_MACHINE")));
  }

  @Test
  void textThatIsNotARoomSearchIsNotUnderstoodAndCarriesNoFilters() {
    fake.replyWithContent(
        """
        {"understood":false,"neighborhood":"Ballard","minMonthlyRent":5,"maxMonthlyRent":null,\
        "minAreaSqft":null,"amenities":["WIFI"]}\
        """);

    ParsedQuery parsed = parser.parse("write me a poem about the sea");

    assertThat(parsed).isEqualTo(new ParsedQuery(false, null, null, null, null, List.of()));
  }

  @Test
  void aSlowProviderIsATimeout() {
    fake.delay(1500).replyWithContent("{}");
    QueryParser impatient = parserWithTimeout(Duration.ofMillis(300));

    assertThatThrownBy(() -> impatient.parse(QUERY))
        .isInstanceOfSatisfying(
            AiException.class, e -> assertThat(e.kind()).isEqualTo(AiException.Kind.TIMEOUT));
  }

  @Test
  void providerRateLimitIsBusy() {
    fake.reply(429, "{\"error\":{\"message\":\"Rate limit reached\"}}");

    assertThatThrownBy(() -> parser.parse(QUERY))
        .isInstanceOfSatisfying(
            AiException.class, e -> assertThat(e.kind()).isEqualTo(AiException.Kind.BUSY));
  }

  @Test
  void providerErrorsAndUnreadableRepliesAreFailures() {
    for (Runnable setup :
        List.<Runnable>of(
            () -> fake.reply(500, "{\"error\":\"boom\"}"),
            () -> fake.reply(401, "{\"error\":\"bad key\"}"),
            () -> fake.reply(200, "not json at all"),
            () -> fake.reply(200, "{\"choices\":[]}"),
            () -> fake.replyWithContent("this is not JSON"),
            () -> fake.replyWithContent("{\"neighborhood\":\"Ballard\"}"))) {
      setup.run();
      assertThatThrownBy(() -> parser.parse(QUERY))
          .isInstanceOfSatisfying(
              AiException.class, e -> assertThat(e.kind()).isEqualTo(AiException.Kind.FAILED));
    }
  }

  @Test
  void withoutAKeyNothingIsSent() {
    QueryParser off =
        new OpenAiCompatibleQueryParser(
            new AiProperties(fake.baseUrl(), "test-model", "", Duration.ofSeconds(2)));

    assertThatThrownBy(() -> off.parse(QUERY))
        .isInstanceOfSatisfying(
            AiException.class, e -> assertThat(e.kind()).isEqualTo(AiException.Kind.UNAVAILABLE));
    assertThat(fake.requestCount()).isZero();
  }

  @Test
  void rejectsEmptyAndOverlongQueriesBeforeCallingTheProvider() {
    assertThatThrownBy(() -> parser.parse(" ")).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> parser.parse("x".repeat(201)))
        .isInstanceOf(IllegalArgumentException.class);
    assertThat(fake.requestCount()).isZero();
  }

  @Test
  void theKeyIsNeverSentOverPlainHttpToAnotherMachine() {
    assertThatThrownBy(
            () -> new AiProperties("http://api.example.com/v1", "m", "k", Duration.ofSeconds(5)))
        .isInstanceOf(IllegalStateException.class);
    assertThat(new AiProperties("https://api.groq.com/openai/v1/", "m", "k", null))
        .satisfies(
            p -> {
              assertThat(p.baseUrl()).isEqualTo("https://api.groq.com/openai/v1");
              assertThat(p.timeout()).isEqualTo(Duration.ofSeconds(5));
              assertThat(p.enabled()).isTrue();
            });
    assertThat(new AiProperties("", "", "", null).enabled()).isFalse();
  }
}
