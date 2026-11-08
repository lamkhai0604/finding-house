package com.findinghouse.moderation;

import com.findinghouse.listing.ListingDtos.ListingResponse;
import com.findinghouse.moderation.ModerationDtos.ActionItem;
import com.findinghouse.moderation.ModerationDtos.DismissRequest;
import com.findinghouse.moderation.ModerationDtos.ListingSummary;
import com.findinghouse.moderation.ModerationDtos.RemoveRequest;
import com.findinghouse.moderation.ModerationDtos.ReportGroup;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** FR-08 AC2 to AC4. Every path is under /api/v1/admin, which SecurityConfig limits to ADMIN. */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

  private final ModerationService moderation;

  public AdminController(ModerationService moderation) {
    this.moderation = moderation;
  }

  @GetMapping("/reports")
  public List<ReportGroup> reports() {
    return moderation.openReports();
  }

  @GetMapping("/listings/removed")
  public List<ListingSummary> removed() {
    return moderation.removedListings();
  }

  @GetMapping("/actions")
  public List<ActionItem> actions() {
    return moderation.recentActions();
  }

  @PostMapping("/listings/{id}/remove")
  public ListingResponse remove(
      @PathVariable long id,
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody RemoveRequest request) {
    return ListingResponse.from(moderation.remove(id, adminId(jwt), request.reason()));
  }

  @PostMapping("/listings/{id}/restore")
  public ListingResponse restore(@PathVariable long id, @AuthenticationPrincipal Jwt jwt) {
    return ListingResponse.from(moderation.restore(id, adminId(jwt)));
  }

  @PostMapping("/listings/{id}/dismiss")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void dismiss(
      @PathVariable long id,
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody(required = false) DismissRequest request) {
    moderation.dismiss(id, adminId(jwt), request == null ? null : request.reason());
  }

  private static long adminId(Jwt jwt) {
    return Long.parseLong(jwt.getSubject());
  }
}
