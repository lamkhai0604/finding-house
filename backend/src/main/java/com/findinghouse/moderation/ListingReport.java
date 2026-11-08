package com.findinghouse.moderation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** FR-08 AC1: a signed-in user's report about a listing (D-038). */
@Entity
@Table(name = "listing_reports")
public class ListingReport {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "listing_id", nullable = false, updatable = false)
  private Long listingId;

  @Column(name = "reporter_id", nullable = false, updatable = false)
  private Long reporterId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20, updatable = false)
  private ReportReason reason;

  @Column(length = 500, updatable = false)
  private String note;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private ReportStatus status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "resolved_at")
  private Instant resolvedAt;

  @Column(name = "resolved_by")
  private Long resolvedBy;

  protected ListingReport() {
    // for JPA
  }

  public ListingReport(
      long listingId, long reporterId, ReportReason reason, String note, Instant createdAt) {
    this.listingId = listingId;
    this.reporterId = reporterId;
    this.reason = reason;
    this.note = note;
    this.status = ReportStatus.OPEN;
    this.createdAt = createdAt;
  }

  /** An administrator closed the report: removed the listing (ACTIONED) or dismissed it. */
  public void resolve(ReportStatus outcome, long adminId, Instant now) {
    if (outcome == ReportStatus.OPEN || status != ReportStatus.OPEN) {
      throw new IllegalStateException("Only open reports are resolved, to a closed status");
    }
    this.status = outcome;
    this.resolvedBy = adminId;
    this.resolvedAt = now;
  }

  public Long getId() {
    return id;
  }

  public Long getListingId() {
    return listingId;
  }

  public Long getReporterId() {
    return reporterId;
  }

  public ReportReason getReason() {
    return reason;
  }

  public String getNote() {
    return note;
  }

  public ReportStatus getStatus() {
    return status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
