package com.findinghouse.favorite;

import com.findinghouse.common.BadRequestException;
import com.findinghouse.common.NotFoundException;
import com.findinghouse.listing.Listing;
import com.findinghouse.listing.ListingRepository;
import com.findinghouse.listing.ListingStatus;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-06: a tenant's saved listings. */
@Service
public class FavoriteService {

  /** Keeps one account from growing the table without bound. */
  static final int MAX_FAVORITES = 200;

  private final FavoriteRepository favorites;
  private final ListingRepository listings;
  private final Clock clock;

  public FavoriteService(FavoriteRepository favorites, ListingRepository listings, Clock clock) {
    this.favorites = favorites;
    this.listings = listings;
    this.clock = clock;
  }

  /**
   * Saves a listing. Saving it again changes nothing (AC1). Only listings anyone can see may be
   * saved; a hidden or missing listing is "not found", the same answer the detail page gives.
   */
  @Transactional
  public void add(long userId, long listingId) {
    Listing listing =
        listings
            .findById(listingId)
            .filter(l -> l.getStatus() == ListingStatus.ACTIVE)
            .orElseThrow(() -> new NotFoundException("Listing not found"));
    if (favorites.existsById(new Favorite.Key(userId, listing.getId()))) {
      return;
    }
    if (favorites.countByUserId(userId) >= MAX_FAVORITES) {
      throw new BadRequestException(
          "listingId", "you can save at most " + MAX_FAVORITES + " rooms; remove some first");
    }
    favorites.insertIfAbsent(userId, listing.getId(), clock.instant());
  }

  /** Removing a listing that is not saved is not an error (the result is the same). */
  @Transactional
  public void remove(long userId, long listingId) {
    favorites.deleteById(new Favorite.Key(userId, listingId));
  }

  @Transactional(readOnly = true)
  public List<Listing> list(long userId) {
    return favorites.findListings(userId, ListingStatus.ACTIVE);
  }

  @Transactional(readOnly = true)
  public List<Long> ids(long userId) {
    return favorites.findListingIds(userId, ListingStatus.ACTIVE);
  }
}
