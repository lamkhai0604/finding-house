package com.findinghouse.favorite;

import com.findinghouse.listing.ListingDtos.ListingResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-06, tenants only (SecurityConfig). Every path is under /me, so a tenant can only ever read or
 * change their own favorites (AC3).
 */
@RestController
@RequestMapping("/api/v1/me/favorites")
public class FavoriteController {

  private final FavoriteService favorites;

  public FavoriteController(FavoriteService favorites) {
    this.favorites = favorites;
  }

  @GetMapping
  public List<ListingResponse> list(@AuthenticationPrincipal Jwt jwt) {
    return favorites.list(userId(jwt)).stream().map(ListingResponse::from).toList();
  }

  /** Just the ids, so list pages can mark saved rooms without loading them all. */
  @GetMapping("/ids")
  public List<Long> ids(@AuthenticationPrincipal Jwt jwt) {
    return favorites.ids(userId(jwt));
  }

  @PutMapping("/{listingId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void add(@AuthenticationPrincipal Jwt jwt, @PathVariable long listingId) {
    favorites.add(userId(jwt), listingId);
  }

  @DeleteMapping("/{listingId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@AuthenticationPrincipal Jwt jwt, @PathVariable long listingId) {
    favorites.remove(userId(jwt), listingId);
  }

  private static long userId(Jwt jwt) {
    return Long.parseLong(jwt.getSubject());
  }
}
