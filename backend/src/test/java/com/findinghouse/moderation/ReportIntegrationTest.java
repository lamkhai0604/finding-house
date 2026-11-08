package com.findinghouse.moderation;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.ApiClient;
import com.findinghouse.IntegrationTest;
import com.findinghouse.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/** T-602 (FR-08 AC1, D-038): reporting a listing. */
@IntegrationTest
class ReportIntegrationTest {

  private static final String LISTING =
      """
      {"title":"Room to report","monthlyPriceCents":120000,"areaSqft":180,
       "neighborhood":"Ballard","address":"3 Sample St","amenities":[],"imageUrls":[]}
      """;
  private static final String SCAM = "{\"reason\":\"SCAM\",\"note\":\"  Asked for a deposit by wire  \"}";

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
  void aTenantOrAnotherLandlordCanReportAnActiveListing() {
    long id = create(accounts.landlord().token());

    HttpResponse<String> byTenant = report(id, SCAM, accounts.tenant().token());
    HttpResponse<String> byLandlord =
        report(id, "{\"reason\":\"WRONG_INFO\"}", accounts.landlord().token());

    assertThat(byTenant.statusCode()).isEqualTo(201);
    assertThat(JsonPath.<String>read(byTenant.body(), "$.status")).isEqualTo("OPEN");
    assertThat(byLandlord.statusCode()).isEqualTo(201);
  }

  @Test
  void guestsMustSignIn() {
    long id = create(accounts.landlord().token());

    assertThat(report(id, SCAM, null).statusCode()).isEqualTo(401);
  }

  @Test
  void nobodyReportsTheirOwnListing() {
    String owner = accounts.landlord().token();
    long id = create(owner);

    assertThat(report(id, SCAM, owner).statusCode()).isEqualTo(403);
  }

  @Test
  void oneOpenReportPerUserPerListing() {
    long id = create(accounts.landlord().token());
    String tenant = accounts.tenant().token();
    report(id, SCAM, tenant);

    HttpResponse<String> again = report(id, "{\"reason\":\"OTHER\"}", tenant);

    assertThat(again.statusCode()).isEqualTo(409);
    assertThat(JsonPath.<String>read(again.body(), "$.code")).isEqualTo("CONFLICT");
  }

  @Test
  void hiddenAndMissingListingsCannotBeReported() {
    String owner = accounts.landlord().token();
    long id = create(owner);
    api.patch("/api/v1/listings/" + id + "/status", "{\"status\":\"HIDDEN\"}", owner);
    String tenant = accounts.tenant().token();

    assertThat(report(id, SCAM, tenant).statusCode()).isEqualTo(404);
    assertThat(report(999_999_999L, SCAM, tenant).statusCode()).isEqualTo(404);
  }

  @Test
  void theReasonIsRequiredAndTheNoteHasALimit() {
    long id = create(accounts.landlord().token());
    String tenant = accounts.tenant().token();

    assertThat(report(id, "{\"note\":\"no reason\"}", tenant).statusCode()).isEqualTo(400);
    assertThat(report(id, "{\"reason\":\"NOT_A_REASON\"}", tenant).statusCode()).isEqualTo(400);
    assertThat(
            report(id, "{\"reason\":\"OTHER\",\"note\":\"" + "x".repeat(501) + "\"}", tenant)
                .statusCode())
        .isEqualTo(400);
  }

  @Test
  void tenReportsADayThenTooManyWithRetryAfter() {
    String landlord = accounts.landlord().token();
    String tenant = accounts.tenant().token();
    for (int i = 0; i < ReportService.MAX_REPORTS_PER_DAY; i++) {
      assertThat(report(create(landlord), SCAM, tenant).statusCode()).isEqualTo(201);
    }

    HttpResponse<String> eleventh = report(create(landlord), SCAM, tenant);

    assertThat(eleventh.statusCode()).isEqualTo(429);
    assertThat(eleventh.headers().firstValue("Retry-After")).isPresent();
  }

  private HttpResponse<String> report(long listingId, String body, String token) {
    return api.post("/api/v1/listings/" + listingId + "/reports", body, token);
  }

  private long create(String token) {
    return JsonPath.<Integer>read(api.post("/api/v1/listings", LISTING, token).body(), "$.id")
        .longValue();
  }
}
