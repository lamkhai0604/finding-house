package com.findinghouse.listing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ListingRepository extends JpaRepository<Listing, Long> {

  List<Listing> findByLandlordIdOrderByCreatedAtDescIdDesc(Long landlordId);
}
