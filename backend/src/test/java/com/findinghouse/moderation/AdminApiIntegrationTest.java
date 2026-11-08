package com.findinghouse.moderation;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.findinghouse.auth.AdminPromotion;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/** T-603 (FR-08 AC2 to AC4, D-037): the administrator API and what removal does elsewhere. */
@IntegrationTest
class AdminApiIntegrationTest {

  @Value("${local.server.port}")
  int port;

  @Autowired AdminPromotion promotion;

  ApiClient api;
  TestAccounts accounts;
  String admin;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
    accounts = new TestAccounts(api);
    admin = accounts.admin(promotion).token();
  }

  @Test
  void everyAdminEndpointIsForAdministratorsOnly() {
    long id = create(accounts.landlord().token(), "Matrix room");
    List<String> gets =
        List.of("/api/v1/admin/reports", "/api/v1/admin/listings/removed", "/api/v1/admin/actions");
    List<String> posts =
        List.of(
            "/api/v1/admin/listings/" + id + "/remove",
            "/api/v1/admin/listings/" + id + "/restore",
            "/api/v1/admin/listings/" + id + "/dismiss");
    String tenant = accounts.tenant().token();
    String landlord = accounts.landlord().token();
    String body = "{\"reason\":\"x\"}";

    for (String path : gets) {
      assertThat(api.get(path, null).statusCode()).as("guest " + path).isEqualTo(401);
      assertThat(api.get(path, tenant).statusCode()).as("tenant " + path).isEqualTo(403);
      assertThat(api.get(path, landlord).statusCode()).as("landlord " + path).isEqualTo(403);
      assertThat(api.get(path, admin).statusCode()).as("admin " + path).isEqualTo(200);
    }
    for (String path : posts) {
      assertThat(api.post(path, body, null).statusCode()).as("guest " + path).isEqualTo(401);
      assertThat(api.post(path, body, tenant).statusCode()).as("tenant " + path).isEqualTo(403);
      assertThat(api.post(path, body, landlord).statusCode()).as("landlord " + path).isEqualTo(403);
    }
    assertThat(
            JsonPath.<String>read(
                api.get("/api/v1/listings/" + id, null).body(), "$.listing.status"))
        .isEqualTo("ACTIVE");
  }

  @Test
  void theQueueGroupsOpenReportsByListing() {
    String title = "Queue room " + UUID.randomUUID();
    long id = create(accounts.landlord().token(), title);
    report(id, "SCAM", accounts.tenant().token());
    report(id, "SCAM", accounts.tenant().token());
    report(id, "WRONG_INFO", accounts.tenant().token());

    String queue = api.get("/api/v1/admin/reports", admin).body();
    String group = "$[?(@.listing.id == " + id + ")]";

    assertThat(JsonPath.<List<Integer>>read(queue, group + ".reportCount")).containsExactly(3);
    assertThat(JsonPath.<List<Integer>>read(queue, group + ".reasons.SCAM")).containsExactly(2);
    assertThat(JsonPath.<List<Integer>>read(queue, group + ".reasons.WRONG_INFO"))
        .containsExactly(1);
    assertThat(JsonPath.<List<String>>read(queue, group + ".listing.title")).containsExactly(title);
  }

  @Test
  void removingTakesTheListingDownEverywhereAndIsRecorded() {
    var owner = accounts.landlord();
    long id = create(owner.token(), "Removal room");
    String tenant = accounts.tenant().token();
    api.put("/api/v1/me/favorites/" + id, "", tenant);
    report(id, "SCAM", tenant);

    HttpResponse<String> removed =
        api.post(
            "/api/v1/admin/listings/" + id + "/remove",
            "{\"reason\":\" Asked for a wire deposit \"}",
            admin);

    assertThat(removed.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<String>read(removed.body(), "$.status")).isEqualTo("REMOVED");
    assertThat(api.get("/api/v1/listings/" + id, null).statusCode()).isEqualTo(404);
    assertThat(api.get("/api/v1/listings/" + id, admin).statusCode())
        .as("admin still sees it")
        .isEqualTo(200);
    String ownerView = api.get("/api/v1/listings/" + id, owner.token()).body();
    assertThat(JsonPath.<String>read(ownerView, "$.listing.removedReason"))
        .isEqualTo("Asked for a wire deposit");
    assertThat(
            JsonPath.<List<Integer>>read(api.get("/api/v1/me/favorites", tenant).body(), "$[*].id"))
        .doesNotContain((int) id);
    assertThat(
            JsonPath.<List<Integer>>read(
                api.get("/api/v1/admin/reports", admin).body(), "$[*].listing.id"))
        .as("its reports are closed")
        .doesNotContain((int) id);
    assertThat(
            JsonPath.<List<Integer>>read(
                api.get("/api/v1/admin/listings/removed", admin).body(), "$[*].id"))
        .contains((int) id);
    String actions = api.get("/api/v1/admin/actions", admin).body();
    assertThat(JsonPath.<List<String>>read(actions, "$[?(@.listingId == " + id + ")].action"))
        .containsExactly("REMOVE");
    assertThat(
            api.post("/api/v1/admin/listings/" + id + "/remove", "{\"reason\":\"again\"}", admin)
                .statusCode())
        .isEqualTo(409);
  }

  @Test
  void removingNeedsAReason() {
    long id = create(accounts.landlord().token(), "No reason room");

    assertThat(
            api.post("/api/v1/admin/listings/" + id + "/remove", "{\"reason\":\"  \"}", admin)
                .statusCode())
        .isEqualTo(400);
    assertThat(api.post("/api/v1/admin/listings/" + id + "/remove", "{}", admin).statusCode())
        .isEqualTo(400);
  }

  @Test
  void restoringBringsTheListingBackHiddenForItsOwnerToShow() {
    String owner = accounts.landlord().token();
    long id = create(owner, "Restored room");
    api.post("/api/v1/admin/listings/" + id + "/remove", "{\"reason\":\"Mistake\"}", admin);

    HttpResponse<String> restored =
        api.post("/api/v1/admin/listings/" + id + "/restore", "", admin);

    assertThat(restored.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<String>read(restored.body(), "$.status")).isEqualTo("HIDDEN");
    assertThat(JsonPath.<Object>read(restored.body(), "$.removedReason")).isNull();
    assertThat(
            api.patch("/api/v1/listings/" + id + "/status", "{\"status\":\"ACTIVE\"}", owner)
                .statusCode())
        .isEqualTo(200);
    assertThat(api.post("/api/v1/admin/listings/" + id + "/restore", "", admin).statusCode())
        .as("only removed listings")
        .isEqualTo(409);
    assertThat(
            JsonPath.<List<String>>read(
                api.get("/api/v1/admin/actions", admin).body(),
                "$[?(@.listingId == " + id + ")].action"))
        .containsExactly("RESTORE", "REMOVE");
  }

  @Test
  void dismissingClosesTheReportsAndKeepsTheListing() {
    long id = create(accounts.landlord().token(), "Fine room");
    report(id, "OTHER", accounts.tenant().token());

    HttpResponse<String> dismissed =
        api.post("/api/v1/admin/listings/" + id + "/dismiss", "{}", admin);

    assertThat(dismissed.statusCode()).isEqualTo(204);
    assertThat(api.get("/api/v1/listings/" + id, null).statusCode()).isEqualTo(200);
    assertThat(
            JsonPath.<List<Integer>>read(
                api.get("/api/v1/admin/reports", admin).body(), "$[*].listing.id"))
        .doesNotContain((int) id);
    assertThat(api.post("/api/v1/admin/listings/" + id + "/dismiss", "{}", admin).statusCode())
        .as("nothing left to dismiss")
        .isEqualTo(409);
  }

  @Test
  void actionsOnAMissingListingAre404() {
    assertThat(
            api.post("/api/v1/admin/listings/999999999/remove", "{\"reason\":\"x\"}", admin)
                .statusCode())
        .isEqualTo(404);
  }

  private void report(long id, String reason, String token) {
    HttpResponse<String> response =
        api.post("/api/v1/listings/" + id + "/reports", "{\"reason\":\"" + reason + "\"}", token);
    assertThat(response.statusCode()).isEqualTo(201);
  }

  private long create(String token, String title) {
    String listing =
        """
        {"title":"%s","monthlyPriceCents":110000,"areaSqft":210,
         "neighborhood":"Wallingford","address":"4 Sample St","amenities":[],"imageUrls":[]}
        """
            .formatted(title);
    return JsonPath.<Integer>read(api.post("/api/v1/listings", listing, token).body(), "$.id")
        .longValue();
  }
}
