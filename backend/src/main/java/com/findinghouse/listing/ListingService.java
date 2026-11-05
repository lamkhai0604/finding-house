package com.findinghouse.listing;

import com.findinghouse.common.BadRequestException;
import com.findinghouse.common.ForbiddenException;
import com.findinghouse.common.NotFoundException;
import com.findinghouse.listing.Listing.ListingDetails;
import com.findinghouse.listing.ListingDtos.ListingRequest;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Listing rules for FR-02: validation beyond simple field constraints, ownership, and status
 * changes. Role checks (only landlords create) are enforced in SecurityConfig.
 */
@Service
public class ListingService {

  private final ListingRepository listings;
  private final Clock clock;

  public ListingService(ListingRepository listings, Clock clock) {
    this.listings = listings;
    this.clock = clock;
  }

  @Transactional
  public Listing create(long landlordId, ListingRequest request) {
    Listing listing = new Listing(landlordId, toDetails(request), clock.instant());
    return listings.save(listing);
  }

  @Transactional
  public Listing update(long listingId, long actorId, ListingRequest request) {
    Listing listing = findOwned(listingId, actorId);
    listing.apply(toDetails(request), clock.instant());
    return listing;
  }

  @Transactional
  public Listing changeStatus(long listingId, long actorId, ListingStatus status) {
    Listing listing = findOwned(listingId, actorId);
    listing.changeStatus(status, clock.instant());
    return listing;
  }

  @Transactional(readOnly = true)
  public List<Listing> listOwnedBy(long landlordId) {
    return listings.findByLandlordIdOrderByCreatedAtDescIdDesc(landlordId);
  }

  private Listing findOwned(long listingId, long actorId) {
    Listing listing =
        listings.findById(listingId).orElseThrow(() -> new NotFoundException("Listing not found"));
    if (!listing.isOwnedBy(actorId)) {
      throw new ForbiddenException("Only the owner can change this listing");
    }
    return listing;
  }

  private static ListingDetails toDetails(ListingRequest request) {
    String neighborhood =
        Market.canonicalNeighborhood(request.neighborhood())
            .orElseThrow(
                () ->
                    new BadRequestException("neighborhood", "is not a known Seattle neighborhood"));
    List<String> imageUrls = request.imageUrls();
    for (int i = 0; i < imageUrls.size(); i++) {
      if (!isHttpsUrl(imageUrls.get(i))) {
        throw new BadRequestException("imageUrls[" + i + "]", "must be an absolute https:// URL");
      }
    }
    Set<Amenity> amenities =
        request.amenities().isEmpty()
            ? EnumSet.noneOf(Amenity.class)
            : EnumSet.copyOf(request.amenities());
    return new ListingDetails(
        request.title(),
        request.description(),
        request.monthlyPriceCents(),
        request.areaSqft(),
        neighborhood,
        request.address(),
        amenities,
        imageUrls);
  }

  /** FR-02 AC2: absolute https URL with a host; anything else (http, javascript:, data:) fails. */
  static boolean isHttpsUrl(String value) {
    try {
      URI uri = new URI(value);
      return "https".equalsIgnoreCase(uri.getScheme())
          && uri.getHost() != null
          && !uri.getHost().isBlank();
    } catch (URISyntaxException e) {
      return false;
    }
  }
}
