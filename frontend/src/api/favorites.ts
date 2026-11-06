import { apiRequest } from "./client";
import type { Listing } from "./types";

/** FR-06: the tenant's saved rooms that are still visible, newest saved first. */
export function getFavorites(): Promise<Listing[]> {
  return apiRequest("GET", "/api/v1/me/favorites");
}

export function getFavoriteIds(): Promise<number[]> {
  return apiRequest("GET", "/api/v1/me/favorites/ids");
}

export async function saveFavorite(listingId: number): Promise<void> {
  await apiRequest<null>("PUT", `/api/v1/me/favorites/${listingId}`);
}

export async function removeFavorite(listingId: number): Promise<void> {
  await apiRequest<null>("DELETE", `/api/v1/me/favorites/${listingId}`);
}
