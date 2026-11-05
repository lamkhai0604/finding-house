package com.findinghouse.listing;

import com.findinghouse.listing.ListingDtos.ListingRequest;
import com.findinghouse.listing.ListingDtos.ListingResponse;
import com.findinghouse.listing.ListingDtos.ReferenceData;
import com.findinghouse.listing.ListingDtos.StatusRequest;
import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ListingController {

  private final ListingService listingService;

  public ListingController(ListingService listingService) {
    this.listingService = listingService;
  }

  @PostMapping("/listings")
  @ResponseStatus(HttpStatus.CREATED)
  public ListingResponse create(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ListingRequest request) {
    return ListingResponse.from(listingService.create(userId(jwt), request));
  }

  @PutMapping("/listings/{id}")
  public ListingResponse update(
      @PathVariable long id,
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody ListingRequest request) {
    return ListingResponse.from(listingService.update(id, userId(jwt), request));
  }

  @PatchMapping("/listings/{id}/status")
  public ListingResponse changeStatus(
      @PathVariable long id,
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody StatusRequest request) {
    return ListingResponse.from(listingService.changeStatus(id, userId(jwt), request.status()));
  }

  @GetMapping("/me/listings")
  public List<ListingResponse> myListings(@AuthenticationPrincipal Jwt jwt) {
    return listingService.listOwnedBy(userId(jwt)).stream().map(ListingResponse::from).toList();
  }

  @GetMapping("/reference-data")
  public ReferenceData referenceData() {
    return new ReferenceData(Market.CITY, Market.NEIGHBORHOODS, Arrays.asList(Amenity.values()));
  }

  private static long userId(Jwt jwt) {
    return Long.parseLong(jwt.getSubject());
  }
}
