package com.findinghouse.moderation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** FR-08 AC1: any signed-in user can report a listing (D-038); guests get 401. */
@RestController
@RequestMapping("/api/v1")
public class ReportController {

  private final ReportService reportService;

  public ReportController(ReportService reportService) {
    this.reportService = reportService;
  }

  @PostMapping("/listings/{id}/reports")
  @ResponseStatus(HttpStatus.CREATED)
  public ReportResponse report(
      @PathVariable long id,
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody ReportRequest request) {
    ListingReport report =
        reportService.report(
            id, Long.parseLong(jwt.getSubject()), request.reason(), request.note());
    return new ReportResponse(report.getId(), report.getStatus());
  }

  public record ReportRequest(@NotNull ReportReason reason, @Size(max = 500) String note) {}

  public record ReportResponse(Long id, ReportStatus status) {}
}
