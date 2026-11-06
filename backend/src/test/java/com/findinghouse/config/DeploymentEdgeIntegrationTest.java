package com.findinghouse.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.IntegrationTest;
import com.findinghouse.TestcontainersConfiguration;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * T-114a / D-030 with deployment-like settings: CORS for one frontend origin, the client address
 * from CF-Connecting-IP, a low per-address login limit, and the request size limit.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      IntegrationTest.TEST_JWT_SECRET_PROPERTY,
      "app.http.cors-allowed-origins=https://frontend.example.test",
      "app.http.client-ip-header=CF-Connecting-IP",
      "app.login-throttle.max-failures-per-address=2",
      "app.registration-throttle.max-per-address=2"
    })
@Import(TestcontainersConfiguration.class)
class DeploymentEdgeIntegrationTest {

  private static final String FRONTEND = "https://frontend.example.test";

  @Value("${local.server.port}")
  int port;

  private final HttpClient client = HttpClient.newHttpClient();

  // --- CORS -------------------------------------------------------------------------------------

  @Test
  void preflightFromTheFrontendIsAllowedWithoutCredentials() throws Exception {
    HttpResponse<String> response =
        send(
            "OPTIONS",
            "/api/v1/listings",
            null,
            Map.of(
                "Origin", FRONTEND,
                "Access-Control-Request-Method", "POST",
                "Access-Control-Request-Headers", "authorization,content-type"));

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).hasValue(FRONTEND);
    assertThat(response.headers().firstValue("Access-Control-Allow-Credentials")).isEmpty();
  }

  @Test
  void otherOriginsAreRefused() throws Exception {
    HttpResponse<String> preflight =
        send(
            "OPTIONS",
            "/api/v1/listings",
            null,
            Map.of("Origin", "https://evil.example", "Access-Control-Request-Method", "GET"));
    HttpResponse<String> simple =
        send("GET", "/api/v1/reference-data", null, Map.of("Origin", "https://evil.example"));

    assertThat(preflight.statusCode()).isEqualTo(403);
    assertThat(simple.statusCode()).isEqualTo(403);
    assertThat(simple.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
  }

  @Test
  void aBrowserRequestFromTheFrontendGetsTheAllowOriginHeader() throws Exception {
    HttpResponse<String> response =
        send("GET", "/api/v1/reference-data", null, Map.of("Origin", FRONTEND));

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).hasValue(FRONTEND);
  }

  // --- Client address (D-024 limit keyed on CF-Connecting-IP) ------------------------------------

  @Test
  void loginLimitFollowsCfConnectingIpAndIgnoresXForwardedFor() throws Exception {
    String attacker = "203.0.113.7";
    for (int i = 0; i < 2; i++) {
      assertThat(failedLogin(attacker, "198.51.100." + i).statusCode()).isEqualTo(401);
    }

    // Blocked even though X-Forwarded-For claims a different address each time.
    HttpResponse<String> blocked = failedLogin(attacker, "198.51.100.99");
    assertThat(blocked.statusCode()).isEqualTo(429);
    assertThat(blocked.headers().firstValue("Retry-After")).isPresent();

    // Another real client is not affected.
    assertThat(failedLogin("203.0.113.8", "198.51.100.1").statusCode()).isEqualTo(401);
  }

  // --- Registration limit (T-113) ----------------------------------------------------------------

  @Test
  void signUpsArePausedPerClientAddressCountingDuplicates() throws Exception {
    String email = "t113-" + UUID.randomUUID() + "@example.com";
    assertThat(register("203.0.113.20", email).statusCode()).isEqualTo(201);
    assertThat(register("203.0.113.20", email).statusCode()).isEqualTo(409);

    HttpResponse<String> paused =
        register("203.0.113.20", "t113-" + UUID.randomUUID() + "@example.com");
    assertThat(paused.statusCode()).isEqualTo(429);
    assertThat(paused.headers().firstValue("Retry-After")).isPresent();
    assertThat(paused.body()).contains("TOO_MANY_ATTEMPTS");

    assertThat(register("203.0.113.21", "t113-" + UUID.randomUUID() + "@example.com").statusCode())
        .isEqualTo(201);
  }

  private HttpResponse<String> register(String cfConnectingIp, String email) throws Exception {
    return send(
        "POST",
        "/api/v1/auth/register",
        "{\"email\":\""
            + email
            + "\",\"password\":\"long-enough-password\",\"displayName\":\"T113\",\"role\":\"TENANT\"}",
        Map.of("Content-Type", "application/json", "CF-Connecting-IP", cfConnectingIp));
  }

  // --- Request size -----------------------------------------------------------------------------

  @Test
  void oversizedBodiesAreRejectedBeforeParsing() throws Exception {
    String huge = "{\"title\":\"" + "x".repeat(70 * 1024) + "\"}";

    HttpResponse<String> response =
        send("POST", "/api/v1/auth/register", huge, Map.of("Content-Type", "application/json"));

    assertThat(response.statusCode()).isEqualTo(413);
    assertThat(response.body()).contains("PAYLOAD_TOO_LARGE");
  }

  private HttpResponse<String> failedLogin(String cfConnectingIp, String xForwardedFor)
      throws Exception {
    String email = "nobody-" + UUID.randomUUID() + "@example.com";
    return send(
        "POST",
        "/api/v1/auth/login",
        "{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}",
        Map.of(
            "Content-Type", "application/json",
            "CF-Connecting-IP", cfConnectingIp,
            "X-Forwarded-For", xForwardedFor));
  }

  private HttpResponse<String> send(
      String method, String path, String body, Map<String, String> headers)
      throws IOException, InterruptedException {
    HttpRequest.Builder builder =
        HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .method(
                method,
                body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(body));
    headers.forEach(builder::header);
    return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
  }
}
