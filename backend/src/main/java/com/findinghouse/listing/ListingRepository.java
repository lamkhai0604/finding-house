package com.findinghouse.listing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ListingRepository
    extends JpaRepository<Listing, Long>, JpaSpecificationExecutor<Listing> {

  List<Listing> findByLandlordIdOrderByCreatedAtDescIdDesc(Long landlordId);

  /** FR-08: removed listings for the admin page, most recently changed first. */
  List<Listing> findByStatusOrderByUpdatedAtDescIdDesc(ListingStatus status);

  /** T-210: one row per neighborhood that has listings in the given status. */
  @Query(
      """
      select new com.findinghouse.listing.NeighborhoodStats(
          l.neighborhood, count(l), min(l.monthlyPriceCents))
      from Listing l
      where l.status = :status
      group by l.neighborhood
      """)
  List<NeighborhoodStats> statsByNeighborhood(@Param("status") ListingStatus status);
}
