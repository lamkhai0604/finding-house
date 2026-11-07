import { useEffect, useState } from "react";
import {
  getAiSearchAvailability,
  type InterpretedFilters,
} from "../api/aiSearch";
import { EMPTY_FILTERS, type FilterValues } from "../browse/filters";
import { centsToDollarsInput } from "../utils/money";

/** The longest description the API accepts (T-302). */
export const MAX_QUERY_LENGTH = 200;

/** What the browse page shows after an AI search: the words and anything that was dropped. */
export interface AiSearchState {
  aiQuery: string;
  aiNotes: string[];
}

let availability: Promise<boolean> | null = null;

/** Asks once per page load whether AI search is on; any failure counts as off. */
function loadAvailability(): Promise<boolean> {
  availability ??= getAiSearchAvailability()
    .then((r) => r.available === true)
    .catch(() => false);
  return availability;
}

/** For tests: forget the cached answer. */
export function resetAiSearchAvailability(): void {
  availability = null;
}

/** T-303: true once the API says AI search is configured; false while unknown or off. */
export function useAiSearchAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    loadAvailability().then((value) => {
      if (active) setAvailable(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return available;
}

/** The interpreted filters as browse filter values (prices back in dollars, like the URL). */
export function toFilterValues(filters: InterpretedFilters): FilterValues {
  return {
    ...EMPTY_FILTERS,
    neighborhood: filters.neighborhood ?? "",
    minPrice:
      filters.minPriceCents == null
        ? ""
        : centsToDollarsInput(filters.minPriceCents),
    maxPrice:
      filters.maxPriceCents == null
        ? ""
        : centsToDollarsInput(filters.maxPriceCents),
    minArea: filters.minAreaSqft == null ? "" : String(filters.minAreaSqft),
    amenities: filters.amenities,
  };
}
