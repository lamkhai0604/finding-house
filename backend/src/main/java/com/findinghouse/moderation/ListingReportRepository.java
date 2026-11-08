package com.findinghouse.moderation;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ListingReportRepository extends JpaRepository<ListingReport, Long> {

  boolean existsByListingIdAndReporterIdAndStatus(
      Long listingId, Long reporterId, ReportStatus status);

  long countByReporterIdAndCreatedAtAfter(Long reporterId, Instant since);

  Optional<ListingReport> findFirstByReporterIdAndCreatedAtAfterOrderByCreatedAtAsc(
      Long reporterId, Instant since);

  List<ListingReport> findByStatusOrderByCreatedAtDesc(ReportStatus status);

  List<ListingReport> findByListingIdAndStatus(Long listingId, ReportStatus status);
}
