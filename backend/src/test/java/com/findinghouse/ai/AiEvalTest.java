package com.findinghouse.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ai.InterpretDtos.Filters;
import com.findinghouse.ai.InterpretDtos.InterpretResponse;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * T-305 (FR-05): accuracy of AI search against a real model. Runs the production path (prompt,
 * schema, adapter, server-side checks) on the fixed sentences in {@code ai-eval/eval-set.json} and
 * writes a per-field report. Off unless {@code AI_EVAL=true}; the provider settings come from the
 * same environment variables as the app. It reports, it does not gate: the only assertion is that
 * every sentence was tried.
 */
@EnabledIfEnvironmentVariable(named = "AI_EVAL", matches = "true")
class AiEvalTest {

  private static final List<String> FIELDS =
      List.of("understood", "neighborhood", "minRent", "maxRent", "minAreaSqft", "amenities");

  record Outcome(
      String id, String group, String query, Map<String, Boolean> fields, String error, long ms) {
    boolean exact() {
      return error == null && fields.values().stream().allMatch(Boolean::booleanValue);
    }
  }

  @Test
  void measuresHowOftenTheModelSetsTheExpectedFilters() throws Exception {
    AiProperties properties =
        new AiProperties(
            System.getenv("AI_BASE_URL"),
            System.getenv("AI_MODEL"),
            System.getenv("AI_API_KEY"),
            Duration.parse("PT" + env("AI_TIMEOUT", "5s").toUpperCase()),
            Integer.valueOf(env("AI_MAX_TOKENS", "1024")),
            System.getenv("AI_REASONING_EFFORT"));
    assertThat(properties.enabled()).as("AI_BASE_URL, AI_MODEL and AI_API_KEY").isTrue();
    InterpretService service =
        new InterpretService(new OpenAiCompatibleQueryParser(properties), properties);
    long pauseMs = Long.parseLong(env("AI_EVAL_PAUSE_MS", "2500"));

    JsonNode cases;
    try (InputStream in = getClass().getResourceAsStream("/ai-eval/eval-set.json")) {
      cases = JsonMapper.builder().build().readTree(in).get("cases");
    }

    List<Outcome> outcomes = new ArrayList<>();
    for (JsonNode c : cases) {
      String query = c.get("query").asString();
      JsonNode expect = c.get("expect");
      long started = System.nanoTime();
      InterpretResponse response = null;
      String error = null;
      try {
        response = service.interpret(query);
      } catch (AiException e) {
        error = e.kind() + ": " + e.getMessage();
      }
      long ms = (System.nanoTime() - started) / 1_000_000;
      Map<String, Boolean> fields = new LinkedHashMap<>();
      if (response != null) {
        Filters f = response.filters();
        fields.put("understood", response.understood() == bool(expect, "understood", true));
        fields.put("neighborhood", Objects.equals(f.neighborhood(), text(expect, "neighborhood")));
        fields.put("minRent", Objects.equals(dollars(f.minPriceCents()), num(expect, "minRent")));
        fields.put("maxRent", Objects.equals(dollars(f.maxPriceCents()), num(expect, "maxRent")));
        fields.put(
            "minAreaSqft",
            Objects.equals(
                f.minAreaSqft() == null ? null : f.minAreaSqft().longValue(),
                num(expect, "minAreaSqft")));
        fields.put("amenities", new TreeSet<>(f.amenities()).equals(set(expect, "amenities")));
      } else {
        FIELDS.forEach(name -> fields.put(name, false));
      }
      Outcome outcome =
          new Outcome(c.get("id").asString(), c.get("group").asString(), query, fields, error, ms);
      outcomes.add(outcome);
      System.out.printf(
          "%s %s %5d ms %s%s%n",
          outcome.id(),
          outcome.exact() ? "PASS" : "MISS",
          ms,
          response == null ? "" : describe(response.filters(), response.understood()),
          error == null ? "" : " (" + error + ")");
      Thread.sleep(pauseMs);
    }

    String report = report(properties, outcomes);
    Path out = Path.of("target", "ai-eval-report.md");
    Files.createDirectories(out.getParent());
    Files.writeString(out, report);
    System.out.println(report);
    assertThat(outcomes).hasSize(cases.size());
  }

  private static String report(AiProperties properties, List<Outcome> outcomes) {
    StringBuilder md = new StringBuilder();
    int n = outcomes.size();
    long exact = outcomes.stream().filter(Outcome::exact).count();
    long errors = outcomes.stream().filter(o -> o.error() != null).count();
    List<Long> times =
        outcomes.stream().filter(o -> o.error() == null).map(Outcome::ms).sorted().toList();
    md.append("| Measure | Result |\n| --- | --- |\n");
    md.append("| Model | `").append(properties.model()).append("`");
    if (!properties.reasoningEffort().isEmpty()) {
      md.append(", reasoning effort ").append(properties.reasoningEffort());
    }
    md.append(" |\n");
    md.append(String.format("| Sentences | %d |%n", n));
    md.append(String.format("| All filters right | %d / %d (%d%%) |%n", exact, n, pct(exact, n)));
    md.append(String.format("| Provider errors or timeouts | %d |%n", errors));
    if (!times.isEmpty()) {
      md.append(
          String.format(
              "| Response time, median / slowest | %d ms / %d ms |%n",
              times.get(times.size() / 2), times.getLast()));
    }
    md.append("\n| Field | Right |\n| --- | --- |\n");
    for (String field : FIELDS) {
      long right = outcomes.stream().filter(o -> o.fields().get(field)).count();
      md.append(String.format("| %s | %d / %d (%d%%) |%n", field, right, n, pct(right, n)));
    }
    md.append("\n| Group | All filters right |\n| --- | --- |\n");
    Map<String, List<Outcome>> byGroup = new LinkedHashMap<>();
    outcomes.forEach(o -> byGroup.computeIfAbsent(o.group(), g -> new ArrayList<>()).add(o));
    byGroup.forEach(
        (group, list) ->
            md.append(
                String.format(
                    "| %s | %d / %d |%n",
                    group, list.stream().filter(Outcome::exact).count(), list.size())));
    md.append("\n| ID | Sentence | Wrong fields |\n| --- | --- | --- |\n");
    outcomes.stream()
        .filter(o -> !o.exact())
        .forEach(
            o ->
                md.append(
                    String.format(
                        "| %s | %s | %s |%n",
                        o.id(),
                        o.query().replace("|", "\\|"),
                        o.error() != null
                            ? o.error()
                            : String.join(
                                ", ",
                                o.fields().entrySet().stream()
                                    .filter(e -> !e.getValue())
                                    .map(Map.Entry::getKey)
                                    .toList()))));
    return md.toString();
  }

  private static String describe(Filters f, boolean understood) {
    if (!understood) {
      return "not a room search";
    }
    return String.format(
        "neighborhood=%s min=%s max=%s area=%s amenities=%s",
        f.neighborhood(),
        dollars(f.minPriceCents()),
        dollars(f.maxPriceCents()),
        f.minAreaSqft(),
        f.amenities());
  }

  private static long pct(long part, long whole) {
    return whole == 0 ? 0 : Math.round(100.0 * part / whole);
  }

  private static Long dollars(Long cents) {
    return cents == null ? null : cents / 100;
  }

  private static String env(String name, String fallback) {
    String value = System.getenv(name);
    return value == null || value.isBlank() ? fallback : value.strip();
  }

  private static boolean bool(JsonNode expect, String field, boolean fallback) {
    return expect.has(field) ? expect.get(field).asBoolean() : fallback;
  }

  private static String text(JsonNode expect, String field) {
    return expect.has(field) ? expect.get(field).asString() : null;
  }

  private static Long num(JsonNode expect, String field) {
    return expect.has(field) ? expect.get(field).asLong() : null;
  }

  private static Set<String> set(JsonNode expect, String field) {
    Set<String> values = new TreeSet<>();
    if (expect.has(field)) {
      expect.get(field).forEach(v -> values.add(v.asString()));
    }
    return values;
  }
}
