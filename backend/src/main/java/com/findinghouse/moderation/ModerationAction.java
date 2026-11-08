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
import org.hibernate.annotations.Immutable;

/** FR-08 AC4: one administrator action. Append-only here and in the database (V5 trigger). */
@Entity
@Immutable
@Table(name = "moderation_actions")
public class ModerationAction {

  public enum Kind {
    REMOVE,
    RESTORE,
    DISMISS
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "listing_id", nullable = false)
  private Long listingId;

  @Column(name = "listing_title", nullable = false, length = 100)
  private String listingTitle;

  @Column(name = "admin_id", nullable = false)
  private Long adminId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private Kind action;

  @Column(length = 200)
  private String reason;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected ModerationAction() {
    // for JPA
  }

  public ModerationAction(
      long listingId,
      String listingTitle,
      long adminId,
      Kind action,
      String reason,
      Instant createdAt) {
    this.listingId = listingId;
    this.listingTitle = listingTitle;
    this.adminId = adminId;
    this.action = action;
    this.reason = reason;
    this.createdAt = createdAt;
  }

  public Long getId() {
    return id;
  }

  public Long getListingId() {
    return listingId;
  }

  public String getListingTitle() {
    return listingTitle;
  }

  public Long getAdminId() {
    return adminId;
  }

  public Kind getAction() {
    return action;
  }

  public String getReason() {
    return reason;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
