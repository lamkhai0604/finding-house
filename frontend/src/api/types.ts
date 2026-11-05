// Shapes of the backend's JSON (ARCHITECTURE §5). Keep in sync with the Java DTOs.

export type Role = "TENANT" | "LANDLORD";

export type Amenity =
  | "AIR_CONDITIONING"
  | "PRIVATE_BATHROOM"
  | "WASHING_MACHINE"
  | "KITCHEN"
  | "PARKING"
  | "WIFI"
  | "FURNISHED"
  | "PETS_ALLOWED";

export type ListingStatus = "ACTIVE" | "HIDDEN";

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
