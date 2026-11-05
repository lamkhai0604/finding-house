package com.findinghouse.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.config.JwtProperties;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/** FR-01 acceptance criteria, exercised over HTTP against a real database. */
@IntegrationTest
class AuthIntegrationTest {

  private static final String PASSWORD = "correct-horse-battery";

  @Value("${local.server.port}")
  int port;

  @Autowired UserAccountRepository users;
  @Autowired JwtEncoder jwtEncoder;
  @Autowired JwtProperties jwtProperties;

  ApiClient api;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
  }

  // --- FR-01 AC1: registration fields -------------------------------------------------------

  @Test
  void registersTenantAndReturnsProfileWithoutPassword() {
    String email = uniqueEmail();

    HttpResponse<String> response = register(email, PASSWORD, "Ana", "TENANT", null);

    assertThat(response.statusCode()).isEqualTo(201);
    assertThat(JsonPath.<Integer>read(response.body(), "$.id")).isPositive();
    assertThat(JsonPath.<String>read(response.body(), "$.email")).isEqualTo(email);
    assertThat(JsonPath.<String>read(response.body(), "$.displayName")).isEqualTo("Ana");
    assertThat(JsonPath.<String>read(response.body(), "$.role")).isEqualTo("TENANT");
    assertThat(response.body()).doesNotContain("password").doesNotContain(PASSWORD);
  }

  @Test
  void landlordCanAddPhone() {
    HttpResponse<String> response =
        register(uniqueEmail(), PASSWORD, "Ben", "LANDLORD", "+1 (206) 555-0100");

    assertThat(response.statusCode()).isEqualTo(201);
    assertThat(JsonPath.<String>read(response.body(), "$.phone")).isEqualTo("+1 (206) 555-0100");
  }

  @Test
  void tenantCannotAddPhone() {
    HttpResponse<String> response =
        register(uniqueEmail(), PASSWORD, "Cam", "TENANT", "206-555-0100");

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(fieldErrors(response)).containsExactly("phone");
  }

  @Test
  void rejectsInvalidFieldsWithFieldLevelErrors() {
    String body =
        """
        {"email":"not-an-email","password":"short","displayName":"","role":null}
        """;

    HttpResponse<String> response = api.post("/api/v1/auth/register", body);

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo("VALIDATION_FAILED");
    assertThat(fieldErrors(response))
        .containsExactlyInAnyOrder("displayName", "email", "password", "role");
  }

  @Test
  void rejectsUnknownRole() {
    String body =
        """
        {"email":"%s","password":"%s","displayName":"Dee","role":"ADMIN"}
        """
            .formatted(uniqueEmail(), PASSWORD);

    HttpResponse<String> response = api.post("/api/v1/auth/register", body);

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo("MALFORMED_REQUEST");
  }

  // --- FR-01 AC2: duplicate email ------------------------------------------------------------

  @Test
  void duplicateEmailIsRejectedCaseInsensitively() {
    String email = uniqueEmail();
    assertThat(register(email, PASSWORD, "Eve", "TENANT", null).statusCode()).isEqualTo(201);

    HttpResponse<String> second =
        register("  " + email.toUpperCase() + " ", PASSWORD, "Eve 2", "LANDLORD", null);

    assertThat(second.statusCode()).isEqualTo(409);
    assertThat(JsonPath.<String>read(second.body(), "$.code")).isEqualTo("EMAIL_TAKEN");
    assertThat(users.findByEmail(email))
        .get()
        .extracting(UserAccount::getDisplayName)
        .isEqualTo("Eve");
  }

  // --- FR-01 AC3: password stored only as a BCrypt hash ---------------------------------------

  @Test
  void storesOnlyBcryptHashOfPassword() {
    String email = uniqueEmail();
    register(email, PASSWORD, "Fay", "TENANT", null);

    UserAccount stored = users.findByEmail(email).orElseThrow();

    assertThat(stored.getPasswordHash()).isNotEqualTo(PASSWORD).startsWith("$2");
  }

  // --- FR-01 AC4: login ----------------------------------------------------------------------

  @Test
  void loginReturnsBearerTokenThatWorksOnProtectedEndpoint() {
    String email = uniqueEmail();
    register(email, PASSWORD, "Gus", "LANDLORD", null);

    HttpResponse<String> login = login(email.toUpperCase(), PASSWORD);

    assertThat(login.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<String>read(login.body(), "$.tokenType")).isEqualTo("Bearer");
    assertThat(JsonPath.<Integer>read(login.body(), "$.expiresIn")).isEqualTo(24 * 60 * 60);

    HttpResponse<String> me = api.get("/api/v1/me", accessToken(login));

    assertThat(me.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<String>read(me.body(), "$.email")).isEqualTo(email);
    assertThat(JsonPath.<String>read(me.body(), "$.role")).isEqualTo("LANDLORD");
  }

  @Test
  void wrongPasswordAndUnknownEmailGetTheSameGenericError() {
    String email = uniqueEmail();
    register(email, PASSWORD, "Hal", "TENANT", null);

    HttpResponse<String> wrongPassword = login(email, "wrong-password-123");
    HttpResponse<String> unknownEmail = login(uniqueEmail(), PASSWORD);

    assertThat(wrongPassword.statusCode()).isEqualTo(401);
    assertThat(unknownEmail.statusCode()).isEqualTo(401);
    assertThat(wrongPassword.body()).isEqualTo(unknownEmail.body());
    assertThat(JsonPath.<String>read(wrongPassword.body(), "$.code"))
        .isEqualTo("INVALID_CREDENTIALS");
  }

  // --- FR-01 AC5: protected endpoints need a valid token -------------------------------------
  // (403 for wrong role or ownership is verified with the first role-restricted endpoint, T-103.)

  @Test
  void protectedEndpointRejectsMissingToken() {
    HttpResponse<String> response = api.get("/api/v1/me", null);

    assertThat(response.statusCode()).isEqualTo(401);
    assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo("UNAUTHORIZED");
  }

  @Test
  void protectedEndpointRejectsMalformedToken() {
    assertThat(api.get("/api/v1/me", "not-a-jwt").statusCode()).isEqualTo(401);
  }

  @Test
  void protectedEndpointRejectsExpiredToken() {
    long userId = registeredUserId();
    Instant past = Instant.now().minusSeconds(7200);
    String token = sign(jwtEncoder, userId, past, past.plusSeconds(3600), jwtProperties.issuer());

    assertThat(api.get("/api/v1/me", token).statusCode()).isEqualTo(401);
  }

  @Test
  void protectedEndpointRejectsTokenSignedWithAnotherKey() {
    long userId = registeredUserId();
    byte[] otherKey = "another-secret-that-is-at-least-32-bytes".getBytes(StandardCharsets.UTF_8);
    JwtEncoder forger =
        NimbusJwtEncoder.withSecretKey(new SecretKeySpec(otherKey, "HmacSHA256")).build();
    Instant now = Instant.now();
    String token = sign(forger, userId, now, now.plusSeconds(3600), jwtProperties.issuer());

    assertThat(api.get("/api/v1/me", token).statusCode()).isEqualTo(401);
  }

  @Test
  void protectedEndpointRejectsTokenFromAnotherIssuer() {
    long userId = registeredUserId();
    Instant now = Instant.now();
    String token = sign(jwtEncoder, userId, now, now.plusSeconds(3600), "someone-else");

    assertThat(api.get("/api/v1/me", token).statusCode()).isEqualTo(401);
  }

  @Test
  void unknownRouteReturns404NotServerError() {
    String token = accessToken(loginAsNewUser());

    HttpResponse<String> response = api.get("/api/v1/does-not-exist", token);

    assertThat(response.statusCode()).isEqualTo(404);
  }

  // --- helpers --------------------------------------------------------------------------------

  private HttpResponse<String> register(
      String email, String password, String displayName, String role, String phone) {
    String phoneJson = phone == null ? "null" : "\"" + phone + "\"";
    String body =
        """
        {"email":"%s","password":"%s","displayName":"%s","role":"%s","phone":%s}
        """
            .formatted(email, password, displayName, role, phoneJson);
    return api.post("/api/v1/auth/register", body);
  }

  private HttpResponse<String> login(String email, String password) {
    return api.post(
        "/api/v1/auth/login",
        """
        {"email":"%s","password":"%s"}
        """
            .formatted(email, password));
  }

  private HttpResponse<String> loginAsNewUser() {
    String email = uniqueEmail();
    register(email, PASSWORD, "Ivy", "TENANT", null);
    return login(email, PASSWORD);
  }

  private long registeredUserId() {
    HttpResponse<String> response = register(uniqueEmail(), PASSWORD, "Jo", "TENANT", null);
    return JsonPath.<Integer>read(response.body(), "$.id").longValue();
  }

  private static String accessToken(HttpResponse<String> loginResponse) {
    return JsonPath.read(loginResponse.body(), "$.accessToken");
  }

  private static List<String> fieldErrors(HttpResponse<String> response) {
    return JsonPath.read(response.body(), "$.fieldErrors[*].field");
  }

  private static String sign(
      JwtEncoder encoder, long userId, Instant issuedAt, Instant expiresAt, String issuer) {
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(issuer)
            .subject(String.valueOf(userId))
            .issuedAt(issuedAt)
            .expiresAt(expiresAt)
            .claim("role", "TENANT")
            .build();
    return encoder
        .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
        .getTokenValue();
  }

  private static String uniqueEmail() {
    return "user-" + UUID.randomUUID() + "@example.com";
  }
}
