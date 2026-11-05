package com.findinghouse.search;

import com.findinghouse.listing.ListingDtos.ListingResponse;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class SearchController {

  private final SearchService searchService;

  public SearchController(SearchService searchService) {
    this.searchService = searchService;
  }

  /**
   * FR-03: public browse. Prices are in US cents. {@code amenities} may repeat or be
   * comma-separated; a listing must have all of them.
   */
  @GetMapping("/listings")
  public PageResponse<ListingResponse> browse(
      @RequestParam(required = false) Long minPriceCents,
      @RequestParam(required = false) Long maxPriceCents,
      @RequestParam(required = false) String neighborhood,
      @RequestParam(required = false) Integer minAreaSqft,
      @RequestParam(required = false) List<String> amenities,
      @RequestParam(required = false) String sort,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    SearchFilter filter =
        SearchFilter.fromQuery(
            minPriceCents, maxPriceCents, neighborhood, minAreaSqft, amenities, sort, page, size);
    Page<ListingResponse> result = searchService.search(filter).map(ListingResponse::from);
    return new PageResponse<>(
        result.getContent(),
        result.getNumber(),
        result.getSize(),
        result.getTotalElements(),
        result.getTotalPages());
  }

  /** FR-03 AC4: one page of results and the totals. */
  public record PageResponse<T>(
      List<T> items, int page, int size, long totalItems, int totalPages) {}
}
