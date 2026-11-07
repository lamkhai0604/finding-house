import type { Amenity } from "./types";
import { apiRequest } from "./client";

/** T-302: filters read from a sentence; same fields and units as the browse API. */
export interface InterpretedFilters {
  neighborhood: string | null;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  minAreaSqft: number | null;
  amenities: Amenity[];
}

export interface Interpretation {
  understood: boolean;
  filters: InterpretedFilters;
  notes: string[];
}

export function getAiSearchAvailability(): Promise<{ available: boolean }> {
  return apiRequest("GET", "/api/v1/search/interpret");
}

export function interpretQuery(query: string): Promise<Interpretation> {
  return apiRequest("POST", "/api/v1/search/interpret", { query });
}
