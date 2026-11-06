import { apiRequest } from "./client";
import type {
  Listing,
  ListingSearch,
  Page,
  ListingDetail,
  ListingRequest,
  ListingStatus,
  NeighborhoodStats,
  ReferenceData,
} from "./types";

export function getListing(id: string | number): Promise<ListingDetail> {
  return apiRequest("GET", `/api/v1/listings/${encodeURIComponent(id)}`);
}

/** Query string for a browse request; empty values are left out. */
export function searchQuery(search: ListingSearch): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** FR-03: public browse of active listings. */
export function searchListings(
  search: ListingSearch = {},
): Promise<Page<Listing>> {
  return apiRequest("GET", `/api/v1/listings${searchQuery(search)}`);
}

export function getReferenceData(): Promise<ReferenceData> {
  return apiRequest("GET", "/api/v1/reference-data");
}

/** T-210: every neighborhood with its count of shown rooms and lowest rent. */
export function getNeighborhoodStats(): Promise<NeighborhoodStats[]> {
  return apiRequest("GET", "/api/v1/neighborhoods");
}

export function getMyListings(): Promise<Listing[]> {
  return apiRequest("GET", "/api/v1/me/listings");
}

export function createListing(request: ListingRequest): Promise<Listing> {
  return apiRequest("POST", "/api/v1/listings", request);
}

export function updateListing(
  id: number,
  request: ListingRequest,
): Promise<Listing> {
  return apiRequest("PUT", `/api/v1/listings/${id}`, request);
}

export function changeListingStatus(
  id: number,
  status: ListingStatus,
): Promise<Listing> {
  return apiRequest("PATCH", `/api/v1/listings/${id}/status`, { status });
}

/** FR-07: permanent delete by the owner (204, no body). */
export async function deleteListing(id: number): Promise<void> {
  await apiRequest<null>("DELETE", `/api/v1/listings/${id}`);
}
