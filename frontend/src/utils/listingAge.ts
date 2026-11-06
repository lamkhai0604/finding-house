import type { Listing } from "../api/types";

/** Rooms posted within this many days get a "New" badge (T-210). */
export const NEW_FOR_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isNew(listing: Listing, now = Date.now()): boolean {
  const posted = Date.parse(listing.createdAt);
  return Number.isFinite(posted) && now - posted < NEW_FOR_DAYS * DAY_MS;
}
