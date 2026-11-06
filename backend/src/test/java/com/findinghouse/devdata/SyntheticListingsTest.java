package com.findinghouse.devdata;

import static org.assertj.core.api.Assertions.assertThat;

import com.findinghouse.devdata.SyntheticListings.SyntheticListing;
import com.findinghouse.listing.ListingDtos;
import com.findinghouse.listing.ListingStatus;
import com.findinghouse.listing.Market;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class SyntheticListingsTest {

  private static final Instant NOW = Instant.parse("2026-11-05T12:00:00Z");

  private static List<SyntheticListing> generate(long seed, int count) {
    return IntStream.range(0, count)
        .mapToObj(i -> SyntheticListings.generate(seed, i, NOW))
        .toList();
  }

  @Test
  void sameSeedAndIndexGiveTheSameListing() {
    assertThat(generate(42, 50)).isEqualTo(generate(42, 50));
    assertThat(SyntheticListings.generate(42, 7, NOW))
        .isNotEqualTo(SyntheticListings.generate(43, 7, NOW));
  }

  @Test
  void everyListingFollowsTheSameRulesAsTheApi() {
    for (SyntheticListing l : generate(42, 2_000)) {
      assertThat(l.title()).hasSizeBetween(5, 100);
      assertThat(l.description())
          .startsWith(SyntheticListings.DESCRIPTION_PREFIX)
          .hasSizeLessThan(2_000);
      assertThat(l.monthlyPriceCents())
          .isPositive()
          .isLessThanOrEqualTo(ListingDtos.MAX_MONTHLY_PRICE_CENTS);
      assertThat(l.monthlyPriceCents() % 2_500).as("whole $25 steps").isZero();
      assertThat(l.areaSqft()).isPositive().isLessThanOrEqualTo(ListingDtos.MAX_AREA_SQFT);
      assertThat(Market.NEIGHBORHOODS).contains(l.neighborhood());
      assertThat(l.address()).hasSizeLessThanOrEqualTo(200);
      assertThat(l.imageUrls()).hasSizeLessThanOrEqualTo(ListingDtos.MAX_IMAGES);
      assertThat(l.imageUrls()).allMatch(url -> url.startsWith("https://"));
      assertThat(l.createdAt()).isBetween(NOW.minus(Duration.ofDays(181)), NOW);
    }
  }

  @Test
  void dataIsVariedEnoughToExerciseEveryFilter() {
    List<SyntheticListing> listings = generate(42, 2_000);

    Set<String> neighborhoods = new HashSet<>();
    listings.forEach(l -> neighborhoods.add(l.neighborhood()));
    assertThat(neighborhoods).containsExactlyInAnyOrderElementsOf(Market.NEIGHBORHOODS);

    long hidden = listings.stream().filter(l -> l.status() == ListingStatus.HIDDEN).count();
    assertThat(hidden).isBetween(100L, 260L); // about 8%

    long noPhotos = listings.stream().filter(l -> l.imageUrls().isEmpty()).count();
    assertThat(noPhotos).isBetween(120L, 300L); // about 10%

    long withWifi =
        listings.stream()
            .filter(l -> l.amenities().contains(com.findinghouse.listing.Amenity.WIFI))
            .count();
    assertThat(withWifi).isBetween(650L, 950L); // about 40%

    assertThat(listings.stream().mapToLong(SyntheticListing::monthlyPriceCents).min().orElseThrow())
        .isLessThan(100_000);
    assertThat(listings.stream().mapToLong(SyntheticListing::monthlyPriceCents).max().orElseThrow())
        .isGreaterThan(250_000);
  }
}
