package com.findinghouse.listing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * T-601 (FR-08 AC3 and AC4, D-037): a removed listing is the moderator's decision. The owner can
 * see it but not change it, everyone else gets 404, and the moderation record is append-only in the
 * database itself.
 */
@IntegrationTest
class RemovedListingIntegrationTest {

  private static final String LISTING =
      """
      {"title":"Too good to be true","monthlyPriceCents":50000,"areaSqft":300,
       "neighborhood":"Fremont","address":"2 Sample St","amenities":["WIFI"],"imageUrls":[]}
      """;

  @Value("${local.server.port}")
  int port;

  @Autowired JdbcTemplate jdbc;

  ApiClient api;
  TestAccounts accounts;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
    accounts = new TestAccounts(api);
  }

  @Test
  void theOwnerSeesARemovedListingButCannotChangeIt() {
    String owner = accounts.landlord().token();
    long id = create(owner);
    removeInDatabase(id);

    assertThat(api.get("/api/v1/listings/" + id, owner).statusCode()).isEqualTo(200);
    assertThat(api.put("/api/v1/listings/" + id, LISTING, owner).statusCode()).isEqualTo(403);
    assertThat(
            api.patch("/api/v1/listings/" + id + "/status", "{\"status\":\"ACTIVE\"}", owner)
                .statusCode())
        .isEqualTo(403);
    assertThat(api.delete("/api/v1/listings/" + id, owner).statusCode()).isEqualTo(403);
  }

  @Test
  void aRemovedListingDoesNotExistForAnyoneElse() {
    String owner = accounts.landlord().token();
    long id = create(owner);
    removeInDatabase(id);

    assertThat(api.get("/api/v1/listings/" + id, null).statusCode()).isEqualTo(404);
    assertThat(api.get("/api/v1/listings/" + id, accounts.tenant().token()).statusCode())
        .isEqualTo(404);
    assertThat(
            JsonPath.<java.util.List<Integer>>read(
                api.get("/api/v1/listings?neighborhood=Fremont&size=50", null).body(),
                "$.items[*].id"))
        .doesNotContain((int) id);
  }

  @Test
  void anOwnerCannotSetTheRemovedStatus() {
    String owner = accounts.landlord().token();
    long id = create(owner);

    var response =
        api.patch("/api/v1/listings/" + id + "/status", "{\"status\":\"REMOVED\"}", owner);

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(
            JsonPath.<String>read(
                api.get("/api/v1/listings/" + id, null).body(), "$.listing.status"))
        .isEqualTo("ACTIVE");
  }

  @Test
  void theDatabaseRequiresAReasonForRemovedListings() {
    long id = create(accounts.landlord().token());

    assertThatThrownBy(() -> jdbc.update("update listings set status = 'REMOVED' where id = ?", id))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void theModerationRecordCannotBeChangedOrErased() {
    long adminId = accounts.tenant().id();
    jdbc.update(
        "insert into moderation_actions (listing_id, listing_title, admin_id, action, reason,"
            + " created_at) values (1, 'x', ?, 'REMOVE', 'test', now())",
        adminId);

    assertThatThrownBy(
            () ->
                jdbc.update(
                    "update moderation_actions set reason = 'edited' where admin_id = ?", adminId))
        .hasMessageContaining("append-only");
    assertThatThrownBy(
            () -> jdbc.update("delete from moderation_actions where admin_id = ?", adminId))
        .hasMessageContaining("append-only");
  }

  private long create(String token) {
    return JsonPath.<Integer>read(api.post("/api/v1/listings", LISTING, token).body(), "$.id")
        .longValue();
  }

  private void removeInDatabase(long id) {
    jdbc.update("update listings set status = 'REMOVED', removed_reason = 'Scam' where id = ?", id);
  }
}
