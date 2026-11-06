package com.findinghouse.favorite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/** A listing saved by a tenant (FR-06). */
@Entity
@Table(name = "favorites")
@IdClass(Favorite.Key.class)
public class Favorite {

  @Id
  @Column(name = "user_id")
  private Long userId;

  @Id
  @Column(name = "listing_id")
  private Long listingId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected Favorite() {}

  public Favorite(long userId, long listingId, Instant createdAt) {
    this.userId = userId;
    this.listingId = listingId;
    this.createdAt = createdAt;
  }

  public Long getListingId() {
    return listingId;
  }

  /** Composite primary key (user, listing). */
  public static class Key implements Serializable {
    private Long userId;
    private Long listingId;

    protected Key() {}

    public Key(long userId, long listingId) {
      this.userId = userId;
      this.listingId = listingId;
    }

    @Override
    public boolean equals(Object other) {
      return other instanceof Key key
          && Objects.equals(userId, key.userId)
          && Objects.equals(listingId, key.listingId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(userId, listingId);
    }
  }
}
