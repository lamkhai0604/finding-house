package com.findinghouse.moderation;

import com.findinghouse.common.ConflictException;
import com.findinghouse.common.ForbiddenException;
import com.findinghouse.common.NotFoundException;
import com.findinghouse.listing.Listing;
import com.findinghouse.listing.ListingRepository;
import com.findinghouse.listing.ListingStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-08 AC1 and D-038: who may report what, and how often. */
@Service
public class ReportService {

  static final int MAX_REPORTS_PER_DAY = 10;
  private static final Duration DAY = Duration.ofHours(24);

  private final ListingReportRepository reports;
  private final ListingRepository listings;
  private final Clock clock;

  public ReportService(ListingReportRepository reports, ListingRepository listings, Clock clock) {
    this.reports = reports;
    this.listings = listings;
    this.clock = clock;
  }

  @Transactional
  public ListingReport report(long listingId, long reporterId, ReportReason reason, String note) {
    // Hidden and removed listings are not visible to the reporter, so they do not exist here.
    Listing listing =
        listings
            .findById(listingId)
            .filter(l -> l.getStatus() == ListingStatus.ACTIVE)
            .orElseThrow(() -> new NotFoundException("Listing not found"));
    if (listing.isOwnedBy(reporterId)) {
      throw new ForbiddenException("You cannot report your own listing");
    }
    if (reports.existsByListingIdAndReporterIdAndStatus(listingId, reporterId, ReportStatus.OPEN)) {
      throw new ConflictException("You already reported this listing");
    }
    Instant now = clock.instant();
    Instant dayAgo = now.minus(DAY);
    if (reports.countByReporterIdAndCreatedAtAfter(reporterId, dayAgo) >= MAX_REPORTS_PER_DAY) {
      Instant oldest =
          reports
              .findFirstByReporterIdAndCreatedAtAfterOrderByCreatedAtAsc(reporterId, dayAgo)
              .map(ListingReport::getCreatedAt)
              .orElse(now);
      throw new TooManyReportsException(Duration.between(now, oldest.plus(DAY)));
    }
    String cleanNote = note == null || note.isBlank() ? null : note.strip();
    try {
      return reports.saveAndFlush(new ListingReport(listingId, reporterId, reason, cleanNote, now));
    } catch (DataIntegrityViolationException e) {
      // A second request from the same user won the race for the one open report.
      throw new ConflictException("You already reported this listing");
    }
  }
}
