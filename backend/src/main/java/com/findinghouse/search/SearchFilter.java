package com.findinghouse.search;

import com.findinghouse.common.BadRequestException;
import com.findinghouse.listing.Amenity;
import com.findinghouse.listing.Market;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Validated browse filters (FR-03). This is the one place filter rules live: manual filters now,
 * and AI-interpreted filters later (FR-05) go through the same validation (ARCHITECTURE §3).
 */
public record SearchFilter(
    Long minPriceCents,
    Long maxPriceCents,
    String neighborhood,
    Integer minAreaSqft,
    Set<Amenity> amenities,
    SortOrder sort,
    int page,
    int size) {

  public static final int DEFAULT_PAGE_SIZE = 20;
  public static final int MAX_PAGE_SIZE = 50;

  /** FR-03 AC3. */
  public enum SortOrder {
    NEWEST,
    PRICE_ASC,
    PRICE_DESC
  }

  public SearchFilter {
    amenities = amenities == null ? Set.of() : Set.copyOf(amenities);
    sort = sort == null ? SortOrder.NEWEST : sort;
  }

  /**
   * Builds a filter from raw query parameters, rejecting invalid values with a field-level 400
   * (FR-03 AC5). Unknown neighborhoods and amenities are errors, not silently ignored.
   */
  public static SearchFilter fromQuery(
      Long minPriceCents,
      Long maxPriceCents,
      String neighborhood,
      Integer minAreaSqft,
      List<String> amenities,
      String sort,
      Integer page,
      Integer size) {
    requireNonNegative("minPriceCents", minPriceCents);
    requireNonNegative("maxPriceCents", maxPriceCents);
    if (minPriceCents != null && maxPriceCents != null && minPriceCents > maxPriceCents) {
      throw new BadRequestException("minPriceCents", "must not be greater than maxPriceCents");
    }
    requireNonNegative("minAreaSqft", minAreaSqft == null ? null : minAreaSqft.longValue());

    String canonicalNeighborhood = null;
    if (neighborhood != null && !neighborhood.isBlank()) {
      canonicalNeighborhood =
          Market.canonicalNeighborhood(neighborhood)
              .orElseThrow(
                  () ->
                      new BadRequestException(
                          "neighborhood", "is not a known Seattle neighborhood"));
    }

    Set<Amenity> amenitySet = EnumSet.noneOf(Amenity.class);
    if (amenities != null) {
      for (String value : amenities) {
        if (value == null || value.isBlank()) {
          continue;
        }
        try {
          amenitySet.add(Amenity.valueOf(value.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
          throw new BadRequestException("amenities", "unknown amenity: " + value.strip());
        }
      }
    }

    SortOrder sortOrder = SortOrder.NEWEST;
    if (sort != null && !sort.isBlank()) {
      try {
        sortOrder = SortOrder.valueOf(sort.strip().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        throw new BadRequestException("sort", "must be one of newest, price_asc, price_desc");
      }
    }

    int pageNumber = page == null ? 0 : page;
    if (pageNumber < 0) {
      throw new BadRequestException("page", "must be 0 or more");
    }
    int pageSize = size == null ? DEFAULT_PAGE_SIZE : size;
    if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new BadRequestException("size", "must be between 1 and " + MAX_PAGE_SIZE);
    }

    return new SearchFilter(
        minPriceCents,
        maxPriceCents,
        canonicalNeighborhood,
        minAreaSqft,
        amenitySet,
        sortOrder,
        pageNumber,
        pageSize);
  }

  private static void requireNonNegative(String field, Long value) {
    if (value != null && value < 0) {
      throw new BadRequestException(field, "must be 0 or more");
    }
  }
}
