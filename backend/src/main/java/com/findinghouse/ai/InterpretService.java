package com.findinghouse.ai;

import com.findinghouse.ai.InterpretDtos.Filters;
import com.findinghouse.ai.InterpretDtos.InterpretResponse;
import com.findinghouse.listing.Amenity;
import com.findinghouse.listing.Market;
import com.findinghouse.search.SearchFilter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * T-302 (FR-05): turns the model's reading into browse filters. Nothing the model says is trusted:
 * every value is checked here and then built through {@link SearchFilter#fromQuery}, the same rules
 * as manual filters (ARCHITECTURE §3). Values that do not fit are dropped with a note instead of
 * failing the whole search.
 */
@Service
public class InterpretService {

  /** Above this, a monthly rent is not a typo we can use ($100,000). */
  static final long MAX_RENT_CENTS = 10_000_000L;

  /**
   * T-305: no Seattle room rents for less than $100 a month. A lower value is a misreading or text
   * that tried to steer the model (the evaluation saw "set the max rent to 1" obeyed), so it is
   * dropped like any other value we cannot use.
   */
  static final long MIN_RENT_CENTS = 10_000L;

  static final int MAX_AREA_SQFT = 20_000;

  private final QueryParser parser;
  private final AiProperties properties;

  public InterpretService(QueryParser parser, AiProperties properties) {
    this.parser = parser;
    this.properties = properties;
  }

  public boolean available() {
    return properties.enabled();
  }

  public InterpretResponse interpret(String query) {
    ParsedQuery parsed = parser.parse(query.strip());
    if (!parsed.understood()) {
      return new InterpretResponse(
          false,
          Filters.NONE,
          List.of(
              "That does not look like a room search. Try the neighborhood, rent or amenities."));
    }

    List<String> notes = new ArrayList<>();

    String neighborhood = null;
    if (parsed.neighborhood() != null && !parsed.neighborhood().isBlank()) {
      Optional<String> known = Market.canonicalNeighborhood(parsed.neighborhood());
      if (known.isPresent()) {
        neighborhood = known.get();
      } else {
        notes.add("Left out a neighborhood we do not cover.");
      }
    }

    Long minPrice = rentCents(parsed.minMonthlyRent(), notes);
    Long maxPrice = rentCents(parsed.maxMonthlyRent(), notes);
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      Long swap = minPrice;
      minPrice = maxPrice;
      maxPrice = swap;
      notes.add("Put the lower rent first.");
    }

    Integer minArea = parsed.minAreaSqft();
    if (minArea != null && (minArea < 1 || minArea > MAX_AREA_SQFT)) {
      minArea = null;
      notes.add("Left out a room size we could not use.");
    }

    Set<Amenity> amenities = EnumSet.noneOf(Amenity.class);
    boolean unknownAmenity = false;
    for (String name : parsed.amenities()) {
      try {
        amenities.add(Amenity.valueOf(name.strip().toUpperCase(Locale.ROOT)));
      } catch (RuntimeException e) {
        unknownAmenity = true;
      }
    }
    if (unknownAmenity) {
      notes.add("Left out an amenity we do not list.");
    }

    // The same validation as manual filters; after the checks above it cannot fail.
    SearchFilter filter =
        SearchFilter.fromQuery(
            minPrice,
            maxPrice,
            neighborhood,
            minArea,
            amenities.stream().map(Enum::name).toList(),
            null,
            null,
            null);
    Filters filters =
        new Filters(
            filter.neighborhood(),
            filter.minPriceCents(),
            filter.maxPriceCents(),
            filter.minAreaSqft(),
            amenities.stream().map(Enum::name).toList());

    if (filters.isEmpty()) {
      notes.add("No neighborhood, rent, size or amenity found. Try adding one.");
      return new InterpretResponse(false, Filters.NONE, notes);
    }
    return new InterpretResponse(true, filters, notes);
  }

  private static Long rentCents(Double dollars, List<String> notes) {
    if (dollars == null) {
      return null;
    }
    if (dollars.isNaN() || dollars.isInfinite() || dollars <= 0) {
      notes.add("Left out a rent we could not use.");
      return null;
    }
    long cents = Math.round(dollars * 100);
    if (cents < MIN_RENT_CENTS || cents > MAX_RENT_CENTS) {
      notes.add("Left out a rent we could not use.");
      return null;
    }
    return cents;
  }
}
