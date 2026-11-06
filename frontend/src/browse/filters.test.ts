import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  toSearch,
} from "./filters";

describe("toSearch (T-202)", () => {
  it("sends prices in cents and pages from 0, leaving empty fields out", () => {
    const { search, errors } = toSearch(
      {
        ...EMPTY_FILTERS,
        minPrice: "$1,200",
        maxPrice: "1999.50",
        minArea: "250",
        amenities: ["WIFI"],
        sort: "price_asc",
      },
      2,
    );

    expect(errors).toEqual({});
    expect(search).toEqual({
      neighborhood: undefined,
      minPriceCents: 120000,
      maxPriceCents: 199950,
      minAreaSqft: 250,
      amenities: ["WIFI"],
      sort: "price_asc",
      page: 1,
      size: 12,
    });
  });

  it("reports each invalid field and sends nothing", () => {
    const { search, errors } = toSearch({
      ...EMPTY_FILTERS,
      minPrice: "cheap",
      maxPrice: "-5",
      minArea: "12.5",
    });

    expect(search).toBeNull();
    expect(Object.keys(errors).sort()).toEqual([
      "maxPrice",
      "minArea",
      "minPrice",
    ]);
  });

  it("rejects a minimum price above the maximum", () => {
    const { errors } = toSearch({
      ...EMPTY_FILTERS,
      minPrice: "2000",
      maxPrice: "1500",
    });

    expect(errors).toEqual({ maxPrice: "Must be at least the minimum price." });
  });

  it("rejects an area of zero", () => {
    expect(toSearch({ ...EMPTY_FILTERS, minArea: "0" }).errors).toHaveProperty(
      "minArea",
    );
  });
});

describe("filters in the URL (T-202)", () => {
  it("round-trips and keeps links short", () => {
    const values = {
      ...EMPTY_FILTERS,
      neighborhood: "Capitol Hill",
      minPrice: "1000",
      amenities: ["WIFI" as const, "KITCHEN" as const],
    };

    const params = filtersToParams(values, 3);

    expect(params.toString()).toBe(
      "neighborhood=Capitol+Hill&minPrice=1000&amenities=WIFI&amenities=KITCHEN&page=3",
    );
    expect(filtersFromParams(params)).toEqual({
      values,
      unknownAmenities: [],
      page: 3,
    });
  });

  it("falls back to defaults for a bad page or sort and reports unknown amenities", () => {
    const parsed = filtersFromParams(
      new URLSearchParams("page=-2&sort=random&amenities=WIFI&amenities=POOL"),
    );

    expect(parsed.page).toBe(1);
    expect(parsed.values.sort).toBe("newest");
    expect(parsed.values.amenities).toEqual(["WIFI"]);
    expect(parsed.unknownAmenities).toEqual(["POOL"]);
  });

  it("is empty for the default filters", () => {
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe("");
  });
});
