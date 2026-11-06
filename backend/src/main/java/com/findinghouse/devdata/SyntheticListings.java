package com.findinghouse.devdata;

import com.findinghouse.listing.Amenity;
import com.findinghouse.listing.ListingStatus;
import com.findinghouse.listing.Market;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * T-203: builds realistic-looking but clearly synthetic Seattle listings. Each listing depends only
 * on (seed, index), so the same settings always give the same data and a partial load can be topped
 * up without changing what is already there.
 */
public final class SyntheticListings {

  /** Marks every synthetic listing so nobody mistakes it for a real one. */
  public static final String DESCRIPTION_PREFIX = "Synthetic listing for development and testing.";

  private static final int MAX_AGE_DAYS = 180;

  private enum Kind {
    ROOM("room", 110, 260, 0.7),
    STUDIO("studio", 300, 520, 1.0),
    ONE_BEDROOM("1BR apartment", 480, 780, 1.4),
    TWO_BEDROOM("2BR apartment", 720, 1150, 2.0);

    final String label;
    final int minArea;
    final int maxArea;
    final double priceFactor;

    Kind(String label, int minArea, int maxArea, double priceFactor) {
      this.label = label;
      this.minArea = minArea;
      this.maxArea = maxArea;
      this.priceFactor = priceFactor;
    }
  }

  private static final List<String> QUALIFIERS =
      List.of(
          "Sunny",
          "Quiet",
          "Renovated",
          "Cozy",
          "Bright",
          "Spacious",
          "Modern",
          "Garden-level",
          "Top-floor",
          "Light-filled");

  private static final List<String> STREETS =
      List.of("Example Ave", "Sample St", "Test Way", "Placeholder Pl", "Demo Blvd");

  private SyntheticListings() {}

  /** One generated listing; values follow the same rules as POST /api/v1/listings. */
  public record SyntheticListing(
      int index,
      String title,
      String description,
      long monthlyPriceCents,
      int areaSqft,
      String neighborhood,
      String address,
      Set<Amenity> amenities,
      List<String> imageUrls,
      ListingStatus status,
      Instant createdAt) {}

  public static SyntheticListing generate(long seed, int index, Instant now) {
    Random random = new Random(seed * 1_000_003L + index);
    Kind kind = Kind.values()[weighted(random, 35, 35, 20, 10)];
    String neighborhood = Market.NEIGHBORHOODS.get(random.nextInt(Market.NEIGHBORHOODS.size()));

    int area = kind.minArea + random.nextInt(kind.maxArea - kind.minArea + 1);
    // Each neighborhood gets a stable base rent between $850 and $1,600 for a studio.
    double base = 850 + Math.floorMod(neighborhood.hashCode(), 751);
    double dollars = base * kind.priceFactor * (0.85 + random.nextDouble() * 0.3);
    long priceCents = Math.round(dollars / 25.0) * 25 * 100;

    Set<Amenity> amenities = EnumSet.noneOf(Amenity.class);
    for (Amenity amenity : Amenity.values()) {
      if (random.nextDouble() < 0.4) {
        amenities.add(amenity);
      }
    }

    int photos = random.nextDouble() < 0.1 ? 0 : 1 + random.nextInt(5);
    List<String> imageUrls = new ArrayList<>(photos);
    for (int k = 0; k < photos; k++) {
      imageUrls.add("https://picsum.photos/seed/fh-syn-" + index + "-" + k + "/800/600");
    }

    String qualifier = QUALIFIERS.get(random.nextInt(QUALIFIERS.size()));
    String title = qualifier + " " + kind.label + " in " + neighborhood;
    String address =
        (100 + random.nextInt(9900))
            + " "
            + STREETS.get(random.nextInt(STREETS.size()))
            + ", Seattle, WA";
    ListingStatus status = random.nextDouble() < 0.92 ? ListingStatus.ACTIVE : ListingStatus.HIDDEN;
    Instant createdAt =
        now.minus(Duration.ofMinutes(random.nextInt(MAX_AGE_DAYS * 24 * 60)))
            .truncatedTo(ChronoUnit.SECONDS);

    return new SyntheticListing(
        index,
        title,
        DESCRIPTION_PREFIX + " Number " + index + ".",
        priceCents,
        area,
        neighborhood,
        address,
        amenities,
        List.copyOf(imageUrls),
        status,
        createdAt);
  }

  private static int weighted(Random random, int... weights) {
    int total = 0;
    for (int w : weights) {
      total += w;
    }
    int pick = random.nextInt(total);
    for (int i = 0; i < weights.length; i++) {
      pick -= weights[i];
      if (pick < 0) {
        return i;
      }
    }
    return weights.length - 1;
  }
}
