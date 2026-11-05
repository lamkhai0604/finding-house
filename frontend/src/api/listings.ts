import { apiRequest } from "./client";
import type { ListingDetail } from "./types";

export function getListing(id: string | number): Promise<ListingDetail> {
  return apiRequest("GET", `/api/v1/listings/${encodeURIComponent(id)}`);
}
