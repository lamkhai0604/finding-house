package com.findinghouse.listing;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.hibernate.annotations.BatchSize;

/** A room for rent (FR-02). Ownership and status rules live in {@link ListingService}. */
@Entity
@Table(name = "listings")
public class Listing {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "landlord_id", nullable = false, updatable = false)
  private Long landlordId;

  @Column(nullable = false, length = 100)
  private String title;

  @Column(nullable = false, length = 2000)
  private String description;

  @Column(name = "monthly_price_cents", nullable = false)
  private long monthlyPriceCents;

  @Column(name = "area_sqft", nullable = false)
  private int areaSqft;

  @Column(nullable = false, length = 50)
  private String city;

  @Column(nullable = false, length = 50)
  private String neighborhood;

  @Column(nullable = false, length = 200)
  private String address;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private ListingStatus status;

  // Loaded for up to 50 listings per query, so a page of results costs a few queries instead of
  // two per listing (review finding O4).
  @BatchSize(size = 50)
  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "listing_amenities", joinColumns = @JoinColumn(name = "listing_id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "amenity", nullable = false, length = 32)
  private Set<Amenity> amenities = EnumSet.noneOf(Amenity.class);

  @BatchSize(size = 50)
  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "listing_images", joinColumns = @JoinColumn(name = "listing_id"))
  @OrderColumn(name = "position")
  @Column(name = "url", nullable = false, length = 2048)
  private List<String> imageUrls = new ArrayList<>();

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Listing() {
    // for JPA
  }

  public Listing(Long landlordId, ListingDetails details, Instant now) {
    this.landlordId = landlordId;
    this.city = Market.CITY;
    this.status = ListingStatus.ACTIVE;
    this.createdAt = now;
    apply(details, now);
  }

  /** Replaces all editable fields. */
  public void apply(ListingDetails details, Instant now) {
    this.title = details.title();
    this.description = details.description();
    this.monthlyPriceCents = details.monthlyPriceCents();
    this.areaSqft = details.areaSqft();
    this.neighborhood = details.neighborhood();
    this.address = details.address();
    this.amenities.clear();
    this.amenities.addAll(details.amenities());
    this.imageUrls.clear();
    this.imageUrls.addAll(details.imageUrls());
    this.updatedAt = now;
  }

  public void changeStatus(ListingStatus newStatus, Instant now) {
    this.status = newStatus;
    this.updatedAt = now;
  }

  public boolean isOwnedBy(long userId) {
    return landlordId == userId;
  }

  public Long getId() {
    return id;
  }

  public Long getLandlordId() {
    return landlordId;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public long getMonthlyPriceCents() {
    return monthlyPriceCents;
  }

  public int getAreaSqft() {
    return areaSqft;
  }

  public String getCity() {
    return city;
  }

  public String getNeighborhood() {
    return neighborhood;
  }

  public String getAddress() {
    return address;
  }

  public ListingStatus getStatus() {
    return status;
  }

  public Set<Amenity> getAmenities() {
    return Set.copyOf(amenities);
  }

  public List<String> getImageUrls() {
    return List.copyOf(imageUrls);
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  /** Validated, normalized values for creating or editing a listing. */
  public record ListingDetails(
      String title,
      String description,
      long monthlyPriceCents,
      int areaSqft,
      String neighborhood,
      String address,
      Set<Amenity> amenities,
      List<String> imageUrls) {}
}
