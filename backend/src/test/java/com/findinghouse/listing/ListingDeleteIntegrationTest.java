package com.findinghouse.listing;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/** FR-07 acceptance criteria: only the owner deletes; deleted listings are gone for everyone. */
@IntegrationTest
class ListingDeleteIntegrationTest {

  private static final String LISTING =
      """
      {"title":"Room posted by mistake","monthlyPriceCents":100000,"areaSqft":200,
       "neighborhood":"Ballard","address":"1 Sample St","amenities":["WIFI","KITCHEN"],
       "imageUrls":["https://example.com/1.jpg"]}
      """;

  @Value("${local.server.port}")
  int port;

  ApiClient api;
  TestAccounts accounts;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
    accounts = new TestAccounts(api);
  }

  @Test
  void ownerDeletesListingAndItIsGoneForEveryone() {
    String owner = accounts.landlord().token();
    long id = create(owner);

    HttpResponse<String> deleted = api.delete("/api/v1/listings/" + id, owner);

    assertThat(deleted.statusCode()).isEqualTo(204);
    assertThat(deleted.body()).isEmpty();
    assertThat(api.get("/api/v1/listings/" + id, owner).statusCode()).isEqualTo(404);
    assertThat(api.get("/api/v1/listings/" + id, null).statusCode()).isEqualTo(404);
    List<Integer> mine = JsonPath.read(api.get("/api/v1/me/listings", owner).body(), "$[*].id");
    assertThat(mine).doesNotContain((int) id);
  }

  @Test
  void hiddenListingCanBeDeletedToo() {
    String owner = accounts.landlord().token();
    long id = create(owner);
    api.patch("/api/v1/listings/" + id + "/status", "{\"status\":\"HIDDEN\"}", owner);

    assertThat(api.delete("/api/v1/listings/" + id, owner).statusCode()).isEqualTo(204);
  }

  @Test
  void onlyTheOwnerCanDelete() {
    String owner = accounts.landlord().token();
    long id = create(owner);

    assertThat(api.delete("/api/v1/listings/" + id, accounts.landlord().token()).statusCode())
        .as("another landlord")
        .isEqualTo(403);
    assertThat(api.delete("/api/v1/listings/" + id, accounts.tenant().token()).statusCode())
        .as("tenant")
        .isEqualTo(403);
    assertThat(api.delete("/api/v1/listings/" + id, null).statusCode())
        .as("anonymous")
        .isEqualTo(401);
    assertThat(api.get("/api/v1/listings/" + id, null).statusCode())
        .as("still there")
        .isEqualTo(200);
  }

  @Test
  void deletingAMissingListingReturns404() {
    HttpResponse<String> response =
        api.delete("/api/v1/listings/999999999", accounts.landlord().token());

    assertThat(response.statusCode()).isEqualTo(404);
  }

  @Test
  void deletingTwiceReturns404TheSecondTime() {
    String owner = accounts.landlord().token();
    long id = create(owner);
    api.delete("/api/v1/listings/" + id, owner);

    assertThat(api.delete("/api/v1/listings/" + id, owner).statusCode()).isEqualTo(404);
  }

  private long create(String token) {
    HttpResponse<String> response = api.post("/api/v1/listings", LISTING, token);
    assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
    return JsonPath.<Integer>read(response.body(), "$.id").longValue();
  }
}
