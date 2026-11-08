package com.findinghouse.moderation;

import com.findinghouse.listing.ListingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Admin API shapes (FR-08 AC2 to AC4). */
public final class ModerationDtos {

  private ModerationDtos() {}

  /** Open reports for one listing, newest report first in {@code reports}. */
  public record ReportGroup(
      ListingSummary listing,
      int reportCount,
      Map<ReportReason, Integer> reasons,
      List<ReportItem> reports,
      Instant latestReportAt) {}

  public record ListingSummary(
      Long id,
      String title,
      String neighborhood,
      ListingStatus status,
      String landlordName,
      String removedReason) {}

  public record ReportItem(ReportReason reason, String note, Instant createdAt) {}

  public record RemoveRequest(@NotBlank @Size(max = 200) String reason) {}

  public record DismissRequest(@Size(max = 200) String reason) {}

  public record ActionItem(
      Long id,
      Long listingId,
      String listingTitle,
      String adminName,
      ModerationAction.Kind action,
      String reason,
      Instant createdAt) {}
}
