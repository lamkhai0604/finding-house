package com.findinghouse.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** T-302: request and response of {@code /api/v1/search/interpret}. */
public final class InterpretDtos {

  private InterpretDtos() {}

  public record InterpretRequest(
      @NotBlank @Size(max = OpenAiCompatibleQueryParser.MAX_QUERY_LENGTH) String query) {}

  /** Same fields and units as the browse API's query parameters (FR-03). */
  public record Filters(
      String neighborhood,
      Long minPriceCents,
      Long maxPriceCents,
      Integer minAreaSqft,
      List<String> amenities) {

    static final Filters NONE = new Filters(null, null, null, null, List.of());

    boolean isEmpty() {
      return neighborhood == null
          && minPriceCents == null
          && maxPriceCents == null
          && minAreaSqft == null
          && amenities.isEmpty();
    }
  }

  /**
   * {@code understood} is false when the text was not a room search or nothing usable came out of
   * it. {@code notes} explain anything that was dropped or changed, in plain words.
   */
  public record InterpretResponse(boolean understood, Filters filters, List<String> notes) {}

  public record AvailabilityResponse(boolean available) {}
}
