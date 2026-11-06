import type { ReactNode } from "react";
import type { Amenity } from "../api/types";

const PATHS: Record<Amenity, ReactNode> = {
  AIR_CONDITIONING: (
    <>
      <path d="M12 3v18" />
      <path d="M4.2 7.5l15.6 9" />
      <path d="M4.2 16.5l15.6-9" />
      <path d="M9.5 4.5L12 7l2.5-2.5" />
      <path d="M9.5 19.5L12 17l2.5 2.5" />
    </>
  ),
  PRIVATE_BATHROOM: (
    <>
      <path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" />
      <path d="M6 12V6a2 2 0 0 1 4 0" />
      <path d="M7 19l-1 2" />
      <path d="M17 19l1 2" />
    </>
  ),
  WASHING_MACHINE: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="13" r="4" />
      <path d="M8 6h2" />
    </>
  ),
  KITCHEN: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 7h2" />
      <path d="M13 7h4" />
    </>
  ),
  PARKING: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </>
  ),
  WIFI: (
    <>
      <path d="M3 9a13 13 0 0 1 18 0" />
      <path d="M6 12.5a8 8 0 0 1 12 0" />
      <path d="M9 16a3.5 3.5 0 0 1 6 0" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  FURNISHED: (
    <>
      <path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
      <path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z" />
      <path d="M5 18v2" />
      <path d="M19 18v2" />
    </>
  ),
  PETS_ALLOWED: (
    <>
      <circle cx="8" cy="7" r="2" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="5" cy="13" r="2" />
      <circle cx="19" cy="13" r="2" />
      <path d="M8 19c0-3 2-5 4-5s4 2 4 5z" />
    </>
  ),
};

/** T-212: a line icon for an amenity; decoration only, the label sits next to it. */
export function AmenityIcon({ amenity }: { amenity: Amenity }) {
  return (
    <svg
      className="amenity-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[amenity]}
    </svg>
  );
}
