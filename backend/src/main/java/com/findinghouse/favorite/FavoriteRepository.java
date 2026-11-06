package com.findinghouse.favorite;

import com.findinghouse.listing.Listing;
import com.findinghouse.listing.ListingStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FavoriteRepository extends JpaRepository<Favorite, Favorite.Key> {

  long countByUserId(Long userId);

  /**
   * Saves once; a second save (even two at the same moment) does nothing, so PUT stays idempotent
   * without a duplicate-key error (FR-06 AC1). Returns 1 if a row was added, 0 otherwise.
   */
  @Modifying
  @Query(
      value =
          "INSERT INTO favorites (user_id, listing_id, created_at)"
              + " VALUES (:userId, :listingId, :createdAt) ON CONFLICT DO NOTHING",
      nativeQuery = true)
  int insertIfAbsent(
      @Param("userId") long userId,
      @Param("listingId") long listingId,
      @Param("createdAt") Instant createdAt);

  /** The tenant's saved listings that are still visible, most recently saved first (FR-06 AC2). */
  @Query(
      """
      select l from Favorite f join Listing l on l.id = f.listingId
      where f.userId = :userId and l.status = :status
      order by f.createdAt desc, f.listingId desc
      """)
  List<Listing> findListings(@Param("userId") Long userId, @Param("status") ListingStatus status);

  @Query(
      """
      select f.listingId from Favorite f join Listing l on l.id = f.listingId
      where f.userId = :userId and l.status = :status
      """)
  List<Long> findListingIds(@Param("userId") Long userId, @Param("status") ListingStatus status);
}
