import type { Amenity, ListingSearch, ListingSort } from "../api/types";
import { isAmenity } from "../utils/format";
import { parseDollarsToCents } from "../utils/money";

/**
 * T-202: browse filters as the visitor typed them. They live in the page URL (so a search can be
 * shared, bookmarked, and reached with Back) and are checked here before anything is sent.
 */
export interface FilterValues {
  neighborhood: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  amenities: Amenity[];
  sort: ListingSort;
}

export type FilterErrors = Partial<Record<keyof FilterValues, string>>;

export const PAGE_SIZE = 12;

const SORTS: ListingSort[] = ["newest", "price_asc", "price_desc"];

export const SORT_OPTIONS: { value: ListingSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export const EMPTY_FILTERS: FilterValues = {
  neighborhood: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  amenities: [],
  sort: "newest",
};

/** Reads filters from the URL. Unknown amenities are kept as text so they can be reported. */
export function filtersFromParams(params: URLSearchParams): {
  values: FilterValues;
  unknownAmenities: string[];
  page: number;
} {
  const amenities: Amenity[] = [];
  const unknownAmenities: string[] = [];
  for (const value of params.getAll("amenities")) {
    if (isAmenity(value)) {
      if (!amenities.includes(value)) amenities.push(value);
    } else {
      unknownAmenities.push(value);
    }
  }
  const sort = params.get("sort") ?? "";
  const page = Number(params.get("page"));
  return {
    values: {
      neighborhood: params.get("neighborhood") ?? "",
      minPrice: params.get("minPrice") ?? "",
      maxPrice: params.get("maxPrice") ?? "",
      minArea: params.get("minArea") ?? "",
      amenities,
      sort: SORTS.includes(sort as ListingSort)
        ? (sort as ListingSort)
        : "newest",
    },
    unknownAmenities,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** The URL for these filters; defaults and empty fields are left out to keep links short. */
export function filtersToParams(
  values: FilterValues,
  page = 1,
): URLSearchParams {
  const params = new URLSearchParams();
  if (values.neighborhood) params.set("neighborhood", values.neighborhood);
  // Plain numbers in the URL ("5000", not "$5,000").
  const plain = (text: string) => text.replace(/[$,\s]/g, "");
  if (plain(values.minPrice)) params.set("minPrice", plain(values.minPrice));
  if (plain(values.maxPrice)) params.set("maxPrice", plain(values.maxPrice));
  if (plain(values.minArea)) params.set("minArea", plain(values.minArea));
  for (const amenity of values.amenities) params.append("amenities", amenity);
  if (values.sort !== "newest") params.set("sort", values.sort);
  if (page > 1) params.set("page", String(page));
  return params;
}

/** Checks the filters and turns them into an API request (prices in cents, page from 0). */
export function toSearch(
  values: FilterValues,
  page = 1,
): { search: ListingSearch | null; errors: FilterErrors } {
  const errors: FilterErrors = {};

  const minPriceCents = optionalPrice(values.minPrice);
  if (minPriceCents === null) {
    errors.minPrice = "Enter an amount in dollars, like 1200.";
  }
  const maxPriceCents = optionalPrice(values.maxPrice);
  if (maxPriceCents === null) {
    errors.maxPrice = "Enter an amount in dollars, like 2000.";
  }
  if (
    minPriceCents != null &&
    maxPriceCents != null &&
    minPriceCents > maxPriceCents
  ) {
    errors.maxPrice = "Must be at least the minimum price.";
  }

  let minAreaSqft: number | undefined;
  const area = values.minArea.replace(/[,\s]/g, "");
  if (area) {
    if (/^\d{1,6}$/.test(area) && Number(area) > 0) {
      minAreaSqft = Number(area);
    } else {
      errors.minArea = "Enter a whole number of square feet.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { search: null, errors };
  }
  return {
    search: {
      neighborhood: values.neighborhood || undefined,
      minPriceCents: minPriceCents ?? undefined,
      maxPriceCents: maxPriceCents ?? undefined,
      minAreaSqft,
      amenities: values.amenities,
      sort: values.sort,
      page: page - 1,
      size: PAGE_SIZE,
    },
    errors,
  };
}

/** undefined for an empty field, null for an invalid one. */
function optionalPrice(input: string): number | undefined | null {
  return input.trim() ? parseDollarsToCents(input) : undefined;
}
