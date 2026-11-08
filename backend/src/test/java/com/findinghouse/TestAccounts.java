package com.findinghouse;

import com.findinghouse.auth.AdminPromotion;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.util.List;
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

  /**
   * D-036: administrators exist only through promotion, so a test admin is a new tenant promoted
   * the way {@code ADMIN_EMAILS} does it, then logged in again for a token with the new role.
   */
  public Account admin(AdminPromotion promotion) {
    Account tenant = create("TENANT");
    if (promotion.promote(List.of(tenant.email())).promoted() != 1) {
      throw new IllegalStateException("promotion failed");
    }
    return new Account(tenant.id(), login(tenant.email()), tenant.email());
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
    long id = JsonPath.<Integer>read(registered.body(), "$.id").longValue();
    return new Account(id, login(email), email);
  }

  private String login(String email) {
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
    return JsonPath.read(login.body(), "$.accessToken");
  }

  public record Account(long id, String token, String email) {}
}
