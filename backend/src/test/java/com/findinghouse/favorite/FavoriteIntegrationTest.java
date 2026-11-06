package com.findinghouse.favorite;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.findinghouse.TestAccounts.Account;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/** FR-06 acceptance criteria over HTTP against PostgreSQL. */
@IntegrationTest
class FavoriteIntegrationTest {

  @Value("${local.server.port}")
  int port;

  ApiClient api;
  TestAccounts accounts;
  Account landlord;
  Account tenant;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
    accounts = new TestAccounts(api);
    landlord = accounts.landlord();
    tenant = accounts.tenant();
  }

  @Test
  void savingTwiceKeepsOneEntry() {
    long id = createListing("Saved twice");

    assertThat(save(tenant, id).statusCode()).isEqualTo(204);
    assertThat(save(tenant, id).statusCode()).isEqualTo(204);

    assertThat(listedIds(tenant)).containsExactly(id);
    assertThat(ids(tenant)).containsExactly(id);
  }

  @Test
  void newestSavedComesFirst() {
    long first = createListing("Saved first");
    long second = createListing("Saved second");
    save(tenant, first);
    save(tenant, second);

    HttpResponse<String> response = api.get("/api/v1/me/favorites", tenant.token());

    assertThat(listedIds(tenant)).containsExactly(second, first);
    assertThat((String) JsonPath.read(response.body(), "$[0].title")).isEqualTo("Saved second");
  }

  @Test
  void aListingHiddenLaterDisappearsFromFavoritesAndComesBackWhenShown() {
    long id = createListing("Hidden later");
    save(tenant, id);

    setStatus(id, "HIDDEN");
    assertThat(listedIds(tenant)).doesNotContain(id);
    assertThat(ids(tenant)).doesNotContain(id);

    setStatus(id, "ACTIVE");
    assertThat(listedIds(tenant)).containsExactly(id);
  }

  @Test
  void hiddenAndMissingListingsCannotBeSaved() {
    long id = createListing("Already hidden");
    setStatus(id, "HIDDEN");

    assertThat(save(tenant, id).statusCode()).isEqualTo(404);
    assertThat(save(tenant, 999_999_999L).statusCode()).isEqualTo(404);
  }

  @Test
  void eachTenantSeesOnlyTheirOwnFavorites() {
    long id = createListing("Only mine");
    Account other = accounts.tenant();
    save(tenant, id);

    assertThat(listedIds(other)).isEmpty();
    assertThat(listedIds(tenant)).containsExactly(id);
  }

  @Test
  void removingIsIdempotent() {
    long id = createListing("Removed");
    save(tenant, id);

    assertThat(remove(tenant, id).statusCode()).isEqualTo(204);
    assertThat(remove(tenant, id).statusCode()).isEqualTo(204);
    assertThat(listedIds(tenant)).isEmpty();
  }

  @Test
  void deletingTheListingRemovesItFromFavorites() {
    long id = createListing("Deleted by owner");
    save(tenant, id);

    assertThat(api.delete("/api/v1/listings/" + id, landlord.token()).statusCode()).isEqualTo(204);

    assertThat(listedIds(tenant)).isEmpty();
  }

  @Test
  void onlyTenantsHaveFavorites() {
    long id = createListing("Not for landlords");

    assertThat(api.get("/api/v1/me/favorites", null).statusCode()).isEqualTo(401);
    assertThat(api.get("/api/v1/me/favorites", landlord.token()).statusCode()).isEqualTo(403);
    assertThat(save(landlord, id).statusCode()).isEqualTo(403);
    assertThat(api.put("/api/v1/me/favorites/" + id, "", null).statusCode()).isEqualTo(401);
  }

  private long createListing(String title) {
    HttpResponse<String> created =
        api.post(
            "/api/v1/listings",
            """
            {"title":"%s","monthlyPriceCents":150000,"areaSqft":300,
             "neighborhood":"Ballard","address":"1 Test St","amenities":[],"imageUrls":[]}
            """
                .formatted(title),
            landlord.token());
    assertThat(created.statusCode()).as(created.body()).isEqualTo(201);
    return JsonPath.<Integer>read(created.body(), "$.id").longValue();
  }

  private void setStatus(long id, String status) {
    assertThat(
            api.patch(
                    "/api/v1/listings/" + id + "/status",
                    "{\"status\":\"" + status + "\"}",
                    landlord.token())
                .statusCode())
        .isEqualTo(200);
  }

  private HttpResponse<String> save(Account account, long id) {
    return api.put("/api/v1/me/favorites/" + id, "", account.token());
  }

  private HttpResponse<String> remove(Account account, long id) {
    return api.delete("/api/v1/me/favorites/" + id, account.token());
  }

  private List<Long> listedIds(Account account) {
    HttpResponse<String> response = api.get("/api/v1/me/favorites", account.token());
    assertThat(response.statusCode()).isEqualTo(200);
    List<Integer> ids = JsonPath.read(response.body(), "$[*].id");
    return ids.stream().map(Integer::longValue).toList();
  }

  private List<Long> ids(Account account) {
    HttpResponse<String> response = api.get("/api/v1/me/favorites/ids", account.token());
    assertThat(response.statusCode()).isEqualTo(200);
    List<Integer> ids = JsonPath.read(response.body(), "$");
    return ids.stream().map(Integer::longValue).toList();
  }
}
