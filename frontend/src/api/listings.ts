import { apiRequest } from "./client";
import type {
  Listing,
  ListingDetail,
  ListingRequest,
  ListingStatus,
  ReferenceData,
} from "./types";

export function getListing(id: string | number): Promise<ListingDetail> {
  return apiRequest("GET", `/api/v1/listings/${encodeURIComponent(id)}`);
}

export function getReferenceData(): Promise<ReferenceData> {
  return apiRequest("GET", "/api/v1/reference-data");
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
