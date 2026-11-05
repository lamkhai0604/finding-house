import type { Amenity } from "../api/types";

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const dollarsAndCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/** 165000 -> "$1,650"; 199550 -> "$1,995.50" (prices are stored in cents). */
export function formatPrice(cents: number): string {
  return cents % 100 === 0
    ? wholeDollars.format(cents / 100)
    : dollarsAndCents.format(cents / 100);
}

const AMENITY_LABELS: Record<Amenity, string> = {
  AIR_CONDITIONING: "Air conditioning",
  PRIVATE_BATHROOM: "Private bathroom",
  WASHING_MACHINE: "Washing machine",
  KITCHEN: "Kitchen",
  PARKING: "Parking",
  WIFI: "Wi-Fi",
  FURNISHED: "Furnished",
  PETS_ALLOWED: "Pets allowed",
};

export function formatAmenity(amenity: Amenity): string {
  return AMENITY_LABELS[amenity];
}

export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString("en-US")} sq ft`;
}
