package com.findinghouse.listing;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/** Request and response bodies for the listing endpoints (FR-02). */
public final class ListingDtos {

  private ListingDtos() {}

  /** Upper bounds catch typos (an extra zero) and keep values far from numeric limits. */
  public static final long MAX_MONTHLY_PRICE_CENTS = 100_000_00L;

  public static final int MAX_AREA_SQFT = 100_000;
  public static final int MAX_IMAGES = 5;

  /**
   * Create or replace a listing. Price is in US cents to avoid floating-point money. City is not
   * accepted: the product serves Seattle only (D-015).
   */
  public record ListingRequest(
      @NotBlank @Size(min = 5, max = 100) String title,
      @Size(max = 2000) String description,
      @NotNull @Positive @Max(MAX_MONTHLY_PRICE_CENTS) Long monthlyPriceCents,
      @NotNull @Positive @Max(MAX_AREA_SQFT) Integer areaSqft,
      @NotBlank String neighborhood,
      @NotBlank @Size(max = 200) String address,
      Set<@NotNull Amenity> amenities,
      @Size(max = MAX_IMAGES) List<@NotBlank @Size(max = 2048) String> imageUrls) {

    public ListingRequest {
      title = strip(title);
      description = description == null ? "" : description.strip();
      address = strip(address);
      amenities = amenities == null ? Set.of() : amenities;
      imageUrls =
          imageUrls == null ? List.of() : imageUrls.stream().map(ListingDtos::strip).toList();
    }
  }

  public record StatusRequest(@NotNull ListingStatus status) {}

  public record ListingResponse(
      Long id,
      Long landlordId,
      String title,
      String description,
      long monthlyPriceCents,
      int areaSqft,
      String city,
      String neighborhood,
      String address,
      List<Amenity> amenities,
      List<String> imageUrls,
      ListingStatus status,
      String removedReason,
      Instant createdAt,
      Instant updatedAt) {

    /**
     * {@code removedReason} is set only on a REMOVED listing, which only its owner and admins see.
     */
    public static ListingResponse from(Listing listing) {
      return new ListingResponse(
          listing.getId(),
          listing.getLandlordId(),
          listing.getTitle(),
          listing.getDescription(),
          listing.getMonthlyPriceCents(),
          listing.getAreaSqft(),
          listing.getCity(),
          listing.getNeighborhood(),
          listing.getAddress(),
          listing.getAmenities().stream().sorted().toList(),
          listing.getImageUrls(),
          listing.getStatus(),
          listing.getRemovedReason(),
          listing.getCreatedAt(),
          listing.getUpdatedAt());
    }
  }

  /**
   * FR-04 detail view: the listing plus the landlord's public contact details. The landlord's email
   * is never exposed.
   */
  public record ListingDetailResponse(ListingResponse listing, LandlordContact landlord) {}

  public record LandlordContact(String displayName, String phone) {}

  /** Values the client needs to build forms and filters, so they are defined in one place. */
  public record ReferenceData(String city, List<String> neighborhoods, List<Amenity> amenities) {}

  private static String strip(String value) {
    return value == null ? null : value.strip();
  }
}
