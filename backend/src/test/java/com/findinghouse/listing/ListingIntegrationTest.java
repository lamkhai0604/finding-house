package com.findinghouse.listing;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.findinghouse.TestAccounts.Account;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/** FR-02 acceptance criteria (and FR-01 AC5's 403 case), over HTTP against a real database. */
@IntegrationTest
class ListingIntegrationTest {

  @Value("${local.server.port}")
  int port;

  ApiClient api;
  TestAccounts accounts;

  @BeforeEach
  void setUp() {
    api = new ApiClient(port);
    accounts = new TestAccounts(api);
  }

  // --- FR-02 AC1, AC3: create with all fields; new listings are ACTIVE ----------------------

  @Test
  void landlordCreatesListingWithAllFields() {
    Account landlord = accounts.landlord();

    HttpResponse<String> response = api.post("/api/v1/listings", validListing(), landlord.token());

    assertThat(response.statusCode()).isEqualTo(201);
    String body = response.body();
    assertThat(JsonPath.<Integer>read(body, "$.id")).isPositive();
    assertThat(JsonPath.<Integer>read(body, "$.landlordId").longValue()).isEqualTo(landlord.id());
    assertThat(JsonPath.<String>read(body, "$.title")).isEqualTo("Sunny studio near UW");
    assertThat(JsonPath.<Integer>read(body, "$.monthlyPriceCents")).isEqualTo(165000);
    assertThat(JsonPath.<Integer>read(body, "$.areaSqft")).isEqualTo(420);
    assertThat(JsonPath.<String>read(body, "$.city")).isEqualTo("Seattle");
    assertThat(JsonPath.<String>read(body, "$.neighborhood")).isEqualTo("University District");
    assertThat(JsonPath.<List<String>>read(body, "$.amenities"))
        .containsExactly("WIFI", "PETS_ALLOWED"); // declaration order, same as reference data
    assertThat(JsonPath.<List<String>>read(body, "$.imageUrls"))
        .containsExactly("https://example.com/a.jpg", "https://example.com/b.jpg");
    assertThat(JsonPath.<String>read(body, "$.status")).isEqualTo("ACTIVE");
  }

  @Test
  void listingWithoutDescriptionAmenitiesOrImagesIsAllowed() {
    String minimal =
        """
        {"title":"Plain room","monthlyPriceCents":90000,"areaSqft":150,
         "neighborhood":"ballard","address":"1 Main St"}
        """;

    HttpResponse<String> response = api.post("/api/v1/listings", minimal, landlordToken());

    assertThat(response.statusCode()).isEqualTo(201);
    assertThat(JsonPath.<String>read(response.body(), "$.neighborhood")).isEqualTo("Ballard");
    assertThat(JsonPath.<String>read(response.body(), "$.description")).isEmpty();
    assertThat(JsonPath.<List<String>>read(response.body(), "$.amenities")).isEmpty();
    assertThat(JsonPath.<List<String>>read(response.body(), "$.imageUrls")).isEmpty();
  }

  // --- FR-01 AC5 (403) and FR-02 AC4: role and ownership ------------------------------------

  @Test
  void tenantCannotCreateListing() {
    HttpResponse<String> response =
        api.post("/api/v1/listings", validListing(), accounts.tenant().token());

    assertThat(response.statusCode()).isEqualTo(403);
    assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo("FORBIDDEN");
  }

  @Test
  void anonymousCannotCreateListing() {
    assertThat(api.post("/api/v1/listings", validListing()).statusCode()).isEqualTo(401);
  }

  @Test
  void anotherLandlordCannotEditOrHideListing() {
    long listingId = createListing(landlordToken());
    String intruder = landlordToken();

    HttpResponse<String> edit = api.put("/api/v1/listings/" + listingId, validListing(), intruder);
    HttpResponse<String> hide =
        api.patch("/api/v1/listings/" + listingId + "/status", "{\"status\":\"HIDDEN\"}", intruder);

    assertThat(edit.statusCode()).isEqualTo(403);
    assertThat(hide.statusCode()).isEqualTo(403);
    assertThat(JsonPath.<String>read(edit.body(), "$.code")).isEqualTo("FORBIDDEN");
  }

  @Test
  void tenantCannotEditListing() {
    long listingId = createListing(landlordToken());

    HttpResponse<String> edit =
        api.put("/api/v1/listings/" + listingId, validListing(), accounts.tenant().token());

    assertThat(edit.statusCode()).isEqualTo(403);
  }

  @Test
  void editingMissingListingReturns404() {
    HttpResponse<String> response =
        api.put("/api/v1/listings/999999999", validListing(), landlordToken());

    assertThat(response.statusCode()).isEqualTo(404);
    assertThat(JsonPath.<String>read(response.body(), "$.code")).isEqualTo("NOT_FOUND");
  }

  @Test
  void nonNumericListingIdReturns400() {
    HttpResponse<String> response =
        api.put("/api/v1/listings/abc", validListing(), landlordToken());

    assertThat(response.statusCode()).isEqualTo(400);
  }

  // --- FR-02 edit --------------------------------------------------------------------------

  @Test
  void ownerEditReplacesAllEditableFields() {
    String token = landlordToken();
    long listingId = createListing(token);
    String edited =
        """
        {"title":"Renovated studio","description":"New floors","monthlyPriceCents":170000,
         "areaSqft":430,"neighborhood":"Fremont","address":"9 Oak Ave",
         "amenities":["KITCHEN"],"imageUrls":["https://example.com/new.jpg"]}
        """;

    HttpResponse<String> response = api.put("/api/v1/listings/" + listingId, edited, token);

    assertThat(response.statusCode()).isEqualTo(200);
    String body = response.body();
    assertThat(JsonPath.<String>read(body, "$.title")).isEqualTo("Renovated studio");
    assertThat(JsonPath.<String>read(body, "$.neighborhood")).isEqualTo("Fremont");
    assertThat(JsonPath.<List<String>>read(body, "$.amenities")).containsExactly("KITCHEN");
    assertThat(JsonPath.<List<String>>read(body, "$.imageUrls"))
        .containsExactly("https://example.com/new.jpg");
    Instant created = Instant.parse(JsonPath.read(body, "$.createdAt"));
    Instant updated = Instant.parse(JsonPath.read(body, "$.updatedAt"));
    assertThat(updated).isAfterOrEqualTo(created);
  }

  // --- FR-02 AC1, AC2, AC5: server-side validation ------------------------------------------

  @Test
  void rejectsInvalidFieldsWithFieldLevelErrors() {
    String invalid =
        """
        {"title":"Hi","monthlyPriceCents":0,"areaSqft":-5,"neighborhood":"Fremont","address":""}
        """;

    HttpResponse<String> response = api.post("/api/v1/listings", invalid, landlordToken());

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(fieldErrors(response))
        .containsExactlyInAnyOrder("address", "areaSqft", "monthlyPriceCents", "title");
  }

  @Test
  void rejectsUnknownNeighborhood() {
    HttpResponse<String> response =
        api.post(
            "/api/v1/listings",
            validListing().replace("University District", "Gotham"),
            landlordToken());

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(fieldErrors(response)).containsExactly("neighborhood");
  }

  @Test
  void rejectsUnknownAmenity() {
    HttpResponse<String> response =
        api.post("/api/v1/listings", validListing().replace("WIFI", "HOT_TUB"), landlordToken());

    assertThat(response.statusCode()).isEqualTo(400);
  }

  @Test
  void rejectsMoreThanFiveImages() {
    String sixImages =
        validListing()
            .replace(
                "\"https://example.com/a.jpg\",\"https://example.com/b.jpg\"",
                String.join(
                    ",",
                    List.of("1", "2", "3", "4", "5", "6").stream()
                        .map(n -> "\"https://example.com/" + n + ".jpg\"")
                        .toList()));

    HttpResponse<String> response = api.post("/api/v1/listings", sixImages, landlordToken());

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(fieldErrors(response)).containsExactly("imageUrls");
  }

  @Test
  void rejectsImageLinksThatAreNotHttps() {
    for (String bad :
        List.of("http://example.com/a.jpg", "javascript:alert(1)", "/relative.jpg", "https://")) {
      String body = validListing().replace("https://example.com/a.jpg", bad);

      HttpResponse<String> response = api.post("/api/v1/listings", body, landlordToken());

      assertThat(response.statusCode()).as(bad).isEqualTo(400);
      assertThat(fieldErrors(response)).as(bad).containsExactly("imageUrls[0]");
    }
  }

  // --- FR-02 AC3, AC6: hide/unhide and "my listings" -----------------------------------------

  @Test
  void ownerCanHideAndUnhide() {
    String token = landlordToken();
    long listingId = createListing(token);
    String path = "/api/v1/listings/" + listingId + "/status";

    HttpResponse<String> hidden = api.patch(path, "{\"status\":\"HIDDEN\"}", token);
    HttpResponse<String> active = api.patch(path, "{\"status\":\"ACTIVE\"}", token);

    assertThat(hidden.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<String>read(hidden.body(), "$.status")).isEqualTo("HIDDEN");
    assertThat(active.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<String>read(active.body(), "$.status")).isEqualTo("ACTIVE");
  }

  @Test
  void rejectsUnknownStatus() {
    String token = landlordToken();
    long listingId = createListing(token);

    HttpResponse<String> response =
        api.patch("/api/v1/listings/" + listingId + "/status", "{\"status\":\"DELETED\"}", token);

    assertThat(response.statusCode()).isEqualTo(400);
  }

  @Test
  void myListingsShowsOnlyOwnListingsIncludingHiddenNewestFirst() {
    String token = landlordToken();
    long first = createListing(token);
    long second = createListing(token);
    api.patch("/api/v1/listings/" + first + "/status", "{\"status\":\"HIDDEN\"}", token);
    createListing(landlordToken()); // someone else's

    HttpResponse<String> response = api.get("/api/v1/me/listings", token);

    assertThat(response.statusCode()).isEqualTo(200);
    List<Integer> ids = JsonPath.read(response.body(), "$[*].id");
    assertThat(ids.stream().map(Integer::longValue).toList()).containsExactly(second, first);
    assertThat(JsonPath.<List<String>>read(response.body(), "$[*].status"))
        .containsExactly("ACTIVE", "HIDDEN");
  }

  @Test
  void tenantHasNoMyListingsPage() {
    assertThat(api.get("/api/v1/me/listings", accounts.tenant().token()).statusCode())
        .isEqualTo(403);
  }

  // --- reference data --------------------------------------------------------------------------

  @Test
  void referenceDataIsPublic() {
    HttpResponse<String> response = api.get("/api/v1/reference-data", null);

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(JsonPath.<String>read(response.body(), "$.city")).isEqualTo("Seattle");
    assertThat(JsonPath.<List<String>>read(response.body(), "$.neighborhoods"))
        .contains("Capitol Hill", "University District");
    assertThat(JsonPath.<List<String>>read(response.body(), "$.amenities"))
        .hasSize(Amenity.values().length);
  }

  // --- helpers --------------------------------------------------------------------------------

  private String landlordToken() {
    return accounts.landlord().token();
  }

  private long createListing(String token) {
    HttpResponse<String> response = api.post("/api/v1/listings", validListing(), token);
    assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
    return JsonPath.<Integer>read(response.body(), "$.id").longValue();
  }

  private static String validListing() {
    return """
    {"title":"Sunny studio near UW","description":"Quiet street, 5 min to campus",
     "monthlyPriceCents":165000,"areaSqft":420,"neighborhood":"University District",
     "address":"4500 Brooklyn Ave NE","amenities":["WIFI","PETS_ALLOWED"],
     "imageUrls":["https://example.com/a.jpg","https://example.com/b.jpg"]}
    """;
  }

  private static List<String> fieldErrors(HttpResponse<String> response) {
    return JsonPath.read(response.body(), "$.fieldErrors[*].field");
  }
}
