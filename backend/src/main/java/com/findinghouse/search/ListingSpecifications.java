package com.findinghouse.search;

import com.findinghouse.listing.Amenity;
import com.findinghouse.listing.Listing;
import com.findinghouse.listing.ListingStatus;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/** Turns a {@link SearchFilter} into a parameterized JPA query (no string-built SQL). */
final class ListingSpecifications {

  private ListingSpecifications() {}

  static Specification<Listing> matching(SearchFilter filter) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      // FR-03 AC1: only active listings are browsable.
      predicates.add(cb.equal(root.get("status"), ListingStatus.ACTIVE));
      if (filter.minPriceCents() != null) {
        predicates.add(
            cb.greaterThanOrEqualTo(root.get("monthlyPriceCents"), filter.minPriceCents()));
      }
      if (filter.maxPriceCents() != null) {
        predicates.add(cb.lessThanOrEqualTo(root.get("monthlyPriceCents"), filter.maxPriceCents()));
      }
      if (filter.neighborhood() != null) {
        predicates.add(cb.equal(root.get("neighborhood"), filter.neighborhood()));
      }
      if (filter.minAreaSqft() != null) {
        predicates.add(cb.greaterThanOrEqualTo(root.get("areaSqft"), filter.minAreaSqft()));
      }
      // FR-03 AC2: a listing must have every selected amenity.
      Expression<Collection<Amenity>> amenities = root.get("amenities");
      for (Amenity amenity : filter.amenities()) {
        predicates.add(cb.isMember(amenity, amenities));
      }
      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }
}
