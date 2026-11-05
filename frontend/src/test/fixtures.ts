import type { ListingDetail, UserProfile } from "../api/types";

export const landlordMaya: UserProfile = {
  id: 1,
  email: "maya.landlord@example.com",
  displayName: "Maya Chen",
  role: "LANDLORD",
  phone: "(206) 555-0101",
};

export function listingDetail(
  overrides: Partial<ListingDetail["listing"]> = {},
  landlord: ListingDetail["landlord"] = {
    displayName: "Maya Chen",
    phone: "(206) 555-0101",
  },
): ListingDetail {
  return {
    listing: {
      id: 7,
      landlordId: 1,
      title: "Sunny studio near UW",
      description: "Bright studio a 5-minute walk from campus.",
      monthlyPriceCents: 165000,
      areaSqft: 420,
      city: "Seattle",
      neighborhood: "University District",
      address: "4500 Sample Ave NE, Seattle, WA",
      amenities: ["WIFI", "PETS_ALLOWED"],
      imageUrls: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
      status: "ACTIVE",
      createdAt: "2026-11-05T10:00:00Z",
      updatedAt: "2026-11-05T10:00:00Z",
      ...overrides,
    },
    landlord,
  };
}
