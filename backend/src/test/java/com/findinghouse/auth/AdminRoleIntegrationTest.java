package com.findinghouse.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.findinghouse.TestAccounts.Account;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/** T-601 (FR-08 AC5, D-036): administrators exist only through configured promotion. */
@IntegrationTest
class AdminRoleIntegrationTest {

  @Value("${local.server.port}")
  int port;

  @Autowired AdminPromotion promotion;

  ApiClient api;
  TestAccounts accounts;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
    accounts = new TestAccounts(api);
  }

  @Test
  void signUpCannotChooseTheAdminRole() {
    HttpResponse<String> response =
        api.post(
            "/api/v1/auth/register",
            """
            {"email":"%s","password":"long-enough-password","displayName":"Mallory","role":"ADMIN"}
            """
                .formatted("admin-" + UUID.randomUUID() + "@example.com"));

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(JsonPath.<List<String>>read(response.body(), "$.fieldErrors[*].field"))
        .containsExactly("role");
  }

  @Test
  void aPromotedTenantLogsInAsAdmin() {
    Account admin = accounts.admin(promotion);

    HttpResponse<String> me = api.get("/api/v1/me", admin.token());

    assertThat(me.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<String>read(me.body(), "$.role")).isEqualTo("ADMIN");
  }

  @Test
  void promotionSkipsLandlordsAndCountsWhatItDid() {
    Account tenant = accounts.tenant();
    Account landlord = accounts.landlord();
    Account alreadyAdmin = accounts.admin(promotion);

    AdminPromotion.Result result =
        promotion.promote(
            List.of(
                "  " + tenant.email().toUpperCase() + " ",
                landlord.email(),
                alreadyAdmin.email(),
                "nobody-" + UUID.randomUUID() + "@example.com"));

    assertThat(result).isEqualTo(new AdminPromotion.Result(1, 1, 1, 1));
    assertThat(JsonPath.<String>read(api.get("/api/v1/me", landlord.token()).body(), "$.role"))
        .isEqualTo("LANDLORD");
  }

  @Test
  void anAdminIsNeitherALandlordNorATenant() {
    String admin = accounts.admin(promotion).token();

    assertThat(api.get("/api/v1/me/listings", admin).statusCode()).isEqualTo(403);
    assertThat(api.get("/api/v1/me/favorites", admin).statusCode()).isEqualTo(403);
  }
}
