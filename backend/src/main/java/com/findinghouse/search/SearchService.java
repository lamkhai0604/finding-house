package com.findinghouse.search;

import com.findinghouse.listing.Listing;
import com.findinghouse.listing.ListingRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-03 browse and filter. */
@Service
public class SearchService {

  private final ListingRepository listings;

  public SearchService(ListingRepository listings) {
    this.listings = listings;
  }

  @Transactional(readOnly = true)
  public Page<Listing> search(SearchFilter filter) {
    PageRequest pageRequest = PageRequest.of(filter.page(), filter.size(), sortFor(filter));
    return listings.findAll(ListingSpecifications.matching(filter), pageRequest);
  }

  /** Every order ends with the id, so equal prices or timestamps still page consistently. */
  private static Sort sortFor(SearchFilter filter) {
    return switch (filter.sort()) {
      case NEWEST -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
      case PRICE_ASC -> Sort.by(Sort.Order.asc("monthlyPriceCents"), Sort.Order.asc("id"));
      case PRICE_DESC -> Sort.by(Sort.Order.desc("monthlyPriceCents"), Sort.Order.desc("id"));
    };
  }
}
