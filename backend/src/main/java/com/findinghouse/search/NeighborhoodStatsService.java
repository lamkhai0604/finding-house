package com.findinghouse.search;

import com.findinghouse.listing.ListingRepository;
import com.findinghouse.listing.ListingStatus;
import com.findinghouse.listing.Market;
import com.findinghouse.listing.NeighborhoodStats;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** T-210: per-neighborhood counts for the home page, from one grouped query. */
@Service
public class NeighborhoodStatsService {

  private final ListingRepository listings;

  public NeighborhoodStatsService(ListingRepository listings) {
    this.listings = listings;
  }

  /** Every neighborhood in {@link Market} order; hidden rooms are not counted. */
  @Transactional(readOnly = true)
  public List<NeighborhoodStats> all() {
    Map<String, NeighborhoodStats> found =
        listings.statsByNeighborhood(ListingStatus.ACTIVE).stream()
            .collect(Collectors.toMap(NeighborhoodStats::neighborhood, Function.identity()));
    return Market.NEIGHBORHOODS.stream()
        .map(n -> found.getOrDefault(n, new NeighborhoodStats(n, 0L, null)))
        .toList();
  }
}
