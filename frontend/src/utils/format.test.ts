import { describe, expect, it } from "vitest";
import { formatAmenity, formatArea, formatPrice } from "./format";

describe("format", () => {
  it("formats cents as US dollars, showing cents only when needed", () => {
    expect(formatPrice(165000)).toBe("$1,650");
    expect(formatPrice(199550)).toBe("$1,995.50");
    expect(formatPrice(85000)).toBe("$850");
  });

  it("formats area and amenities for people", () => {
    expect(formatArea(1200)).toBe("1,200 sq ft");
    expect(formatAmenity("PETS_ALLOWED")).toBe("Pets allowed");
    expect(formatAmenity("WIFI")).toBe("Wi-Fi");
  });
});
