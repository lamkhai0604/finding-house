package com.findinghouse.listing;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/** FR-04 acceptance criteria: public listing detail, hidden listings, missing listings. */
@IntegrationTest
class ListingDetailIntegrationTest {

  private static final String LISTING =
      """
      {"title":"Ballard loft with parking","description":"Open loft, high ceilings",
       "monthlyPriceCents":245000,"areaSqft":780,"neighborhood":"Ballard",
       "address":"5300 Sample Way NW","amenities":["PARKING","WIFI"],
       "imageUrls":["https://example.com/1.jpg","https://example.com/2.jpg"]}
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

  // --- FR-04 AC1: everything a visitor needs, without logging in -----------------------------

  @Test
  void anyoneCanViewActiveListingWithLandlordContact() {
    String email = "owner-" + UUID.randomUUID() + "@example.com";
    String token = registerLandlord(email, "Omar Haddad", "(206) 555-0102");
    long id = create(token);

    HttpResponse<String> response = api.get("/api/v1/listings/" + id, null);

    assertThat(response.statusCode()).isEqualTo(200);
    String body = response.body();
    assertThat(JsonPath.<String>read(body, "$.listing.title"))
        .isEqualTo("Ballard loft with parking");
    assertThat(JsonPath.<String>read(body, "$.listing.description"))
        .isEqualTo("Open loft, high ceilings");
    assertThat(JsonPath.<Integer>read(body, "$.listing.monthlyPriceCents")).isEqualTo(245000);
    assertThat(JsonPath.<Integer>read(body, "$.listing.areaSqft")).isEqualTo(780);
    assertThat(JsonPath.<String>read(body, "$.listing.neighborhood")).isEqualTo("Ballard");
    assertThat(JsonPath.<String>read(body, "$.listing.address")).isEqualTo("5300 Sample Way NW");
    assertThat(JsonPath.<List<String>>read(body, "$.listing.amenities"))
        .containsExactly("PARKING", "WIFI");
    assertThat(JsonPath.<List<String>>read(body, "$.listing.imageUrls")).hasSize(2);
    assertThat(JsonPath.<String>read(body, "$.landlord.displayName")).isEqualTo("Omar Haddad");
    assertThat(JsonPath.<String>read(body, "$.landlord.phone")).isEqualTo("(206) 555-0102");
    assertThat(body).doesNotContain(email);
  }

  @Test
  void landlordWithoutPhoneHasNullPhone() {
    long id = create(accounts.landlord().token());

    HttpResponse<String> response = api.get("/api/v1/listings/" + id, null);

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<Object>read(response.body(), "$.landlord.phone")).isNull();
  }

  // --- FR-04 AC2: hidden listings are 404 for everyone except the owner ----------------------

  @Test
  void hiddenListingIsNotFoundForEveryoneButTheOwner() {
    String ownerToken = accounts.landlord().token();
    long id = create(ownerToken);
    api.patch("/api/v1/listings/" + id + "/status", "{\"status\":\"HIDDEN\"}", ownerToken);
    String path = "/api/v1/listings/" + id;

    assertThat(api.get(path, null).statusCode()).as("anonymous").isEqualTo(404);
    assertThat(api.get(path, accounts.tenant().token()).statusCode()).as("tenant").isEqualTo(404);
    assertThat(api.get(path, accounts.landlord().token()).statusCode())
        .as("other landlord")
        .isEqualTo(404);

    HttpResponse<String> owner = api.get(path, ownerToken);
    assertThat(owner.statusCode()).as("owner").isEqualTo(200);
    assertThat(JsonPath.<String>read(owner.body(), "$.listing.status")).isEqualTo("HIDDEN");
  }

  @Test
  void hiddenAndMissingListingsReturnTheSameBody() {
    String ownerToken = accounts.landlord().token();
    long id = create(ownerToken);
    api.patch("/api/v1/listings/" + id + "/status", "{\"status\":\"HIDDEN\"}", ownerToken);

    HttpResponse<String> hidden = api.get("/api/v1/listings/" + id, null);
    HttpResponse<String> missing = api.get("/api/v1/listings/999999999", null);

    assertThat(hidden.body()).isEqualTo(missing.body());
  }

  // --- FR-04 AC3: missing listing ------------------------------------------------------------

  @Test
  void missingListingReturns404() {
    HttpResponse<String> response = api.get("/api/v1/listings/999999999", null);

    assertThat(response.statusCode()).isEqualTo(404);
    assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo("NOT_FOUND");
  }

  @Test
  void invalidTokenOnPublicEndpointIsRejectedRatherThanIgnored() {
    long id = create(accounts.landlord().token());

    assertThat(api.get("/api/v1/listings/" + id, "not-a-jwt").statusCode()).isEqualTo(401);
  }

  // --- helpers --------------------------------------------------------------------------------

  private long create(String token) {
    HttpResponse<String> response = api.post("/api/v1/listings", LISTING, token);
    assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
    return JsonPath.<Integer>read(response.body(), "$.id").longValue();
  }

  private String registerLandlord(String email, String displayName, String phone) {
    String password = "landlord-password";
    api.post(
        "/api/v1/auth/register",
        """
        {"email":"%s","password":"%s","displayName":"%s","role":"LANDLORD","phone":"%s"}
        """
            .formatted(email, password, displayName, phone));
    HttpResponse<String> login =
        api.post(
            "/api/v1/auth/login",
            """
            {"email":"%s","password":"%s"}
            """
                .formatted(email, password));
    return JsonPath.read(login.body(), "$.accessToken");
  }
}
