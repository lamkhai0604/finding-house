package com.findinghouse.listing;

import java.util.List;
import java.util.Optional;

/**
 * The single market the product serves (D-015). Neighborhoods are a fixed list so that filters and
 * AI search work on known values (SRS §6).
 */
public final class Market {

  public static final String CITY = "Seattle";

  public static final List<String> NEIGHBORHOODS =
      List.of(
          "Ballard",
          "Beacon Hill",
          "Belltown",
          "Capitol Hill",
          "Central District",
          "Columbia City",
          "Downtown",
          "Eastlake",
          "First Hill",
          "Fremont",
          "Georgetown",
          "Green Lake",
          "Greenwood",
          "International District",
          "Lake City",
          "Magnolia",
          "Northgate",
          "Queen Anne",
          "Rainier Valley",
          "Ravenna",
          "Roosevelt",
          "South Lake Union",
          "University District",
          "Wallingford",
          "West Seattle");

  private Market() {}

  /** Returns the canonical spelling of a neighborhood, ignoring case and surrounding spaces. */
  public static Optional<String> canonicalNeighborhood(String value) {
    if (value == null) {
      return Optional.empty();
    }
    String trimmed = value.strip();
    return NEIGHBORHOODS.stream().filter(n -> n.equalsIgnoreCase(trimmed)).findFirst();
  }
}
