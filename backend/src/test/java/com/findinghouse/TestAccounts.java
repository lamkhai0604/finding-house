package com.findinghouse;

import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.util.UUID;

/** Creates fresh accounts through the real API, so every test has its own isolated users. */
public final class TestAccounts {

  private static final String PASSWORD = "test-account-password";

  private final ApiClient api;

  public TestAccounts(ApiClient api) {
    this.api = api;
  }

  public Account landlord() {
    return create("LANDLORD");
  }

  public Account tenant() {
    return create("TENANT");
  }

  private Account create(String role) {
    String email = "acct-" + UUID.randomUUID() + "@example.com";
    HttpResponse<String> registered =
        api.post(
            "/api/v1/auth/register",
            """
            {"email":"%s","password":"%s","displayName":"Test %s","role":"%s"}
            """
                .formatted(email, PASSWORD, role, role));
    if (registered.statusCode() != 201) {
      throw new IllegalStateException("register failed: " + registered.body());
    }
    HttpResponse<String> login =
        api.post(
            "/api/v1/auth/login",
            """
            {"email":"%s","password":"%s"}
            """
                .formatted(email, PASSWORD));
    if (login.statusCode() != 200) {
      throw new IllegalStateException("login failed: " + login.body());
    }
    long id = JsonPath.<Integer>read(registered.body(), "$.id").longValue();
    return new Account(id, JsonPath.read(login.body(), "$.accessToken"));
  }

  public record Account(long id, String token) {}
}
