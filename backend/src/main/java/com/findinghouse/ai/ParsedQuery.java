package com.findinghouse.ai;

import java.util.List;

/**
 * T-301: what the model read in a search sentence, before our own validation (T-302). Prices are
 * monthly US dollars as the model wrote them; anything may be null or out of range, and amenity
 * names may be wrong. {@code understood} is false when the text is not about finding a room.
 */
public record ParsedQuery(
    boolean understood,
    String neighborhood,
    Double minMonthlyRent,
    Double maxMonthlyRent,
    Integer minAreaSqft,
    List<String> amenities) {

  public ParsedQuery {
    amenities = amenities == null ? List.of() : List.copyOf(amenities);
  }
}
