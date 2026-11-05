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
