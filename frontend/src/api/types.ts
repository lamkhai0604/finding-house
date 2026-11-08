// Shapes of the backend's JSON (ARCHITECTURE §5). Keep in sync with the Java DTOs.

/** ADMIN (FR-08, D-036) is never chosen at sign-up; it is granted by configuration. */
export type Role = "TENANT" | "LANDLORD" | "ADMIN";

export type Amenity =
  | "AIR_CONDITIONING"
  | "PRIVATE_BATHROOM"
  | "WASHING_MACHINE"
  | "KITCHEN"
  | "PARKING"
  | "WIFI"
  | "FURNISHED"
  | "PETS_ALLOWED";

/** REMOVED (FR-08, D-037) is set only by a moderator. */
export type ListingStatus = "ACTIVE" | "HIDDEN" | "REMOVED";

export interface UserProfile {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  phone: string | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role: Role;
  phone?: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface Listing {
  id: number;
  landlordId: number;
  title: string;
  description: string;
  monthlyPriceCents: number;
  areaSqft: number;
  city: string;
  neighborhood: string;
  address: string;
  amenities: Amenity[];
  imageUrls: string[];
  status: ListingStatus;
  /** Why a moderator removed it; only on REMOVED listings, which only owners and admins see. */
  removedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating or replacing a listing (FR-02). Price in US cents. */
export interface ListingRequest {
  title: string;
  description: string;
  monthlyPriceCents: number;
  areaSqft: number;
  neighborhood: string;
  address: string;
  amenities: Amenity[];
  imageUrls: string[];
}

/** One page of results from GET /api/v1/listings (FR-03). */
export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export type ListingSort = "newest" | "price_asc" | "price_desc";

/** Browse filters (FR-03). All optional; prices in US cents; page starts at 0. */
export interface ListingSearch {
  minPriceCents?: number;
  maxPriceCents?: number;
  neighborhood?: string;
  minAreaSqft?: number;
  amenities?: Amenity[];
  sort?: ListingSort;
  page?: number;
  size?: number;
}

export interface ReferenceData {
  city: string;
  neighborhoods: string[];
  amenities: Amenity[];
}

export interface ListingDetail {
  listing: Listing;
  landlord: { displayName: string; phone: string | null };
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors: FieldError[];
}

/** T-210: shown rooms and the lowest rent in one neighborhood (null when it has none). */
export interface NeighborhoodStats {
  neighborhood: string;
  activeListings: number;
  lowestMonthlyPriceCents: number | null;
}

// --- FR-08 moderation -------------------------------------------------------------------------

export type ReportReason =
  "SCAM" | "WRONG_INFO" | "UNAVAILABLE" | "OFFENSIVE" | "OTHER";

export interface ModerationListing {
  id: number;
  title: string;
  neighborhood: string;
  status: ListingStatus;
  landlordName: string | null;
  removedReason: string | null;
}

/** Open reports for one listing (GET /api/v1/admin/reports), newest report first. */
export interface ReportGroup {
  listing: ModerationListing;
  reportCount: number;
  reasons: Partial<Record<ReportReason, number>>;
  reports: { reason: ReportReason; note: string | null; createdAt: string }[];
  latestReportAt: string;
}

export interface ModerationActionItem {
  id: number;
  listingId: number;
  listingTitle: string;
  adminName: string | null;
  action: "REMOVE" | "RESTORE" | "DISMISS";
  reason: string | null;
  createdAt: string;
}
