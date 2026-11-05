import { describe, expect, it } from "vitest";
import { centsToDollarsInput, parseDollarsToCents } from "./money";

describe("parseDollarsToCents", () => {
  it.each([
    ["1650", 165000],
    ["1650.5", 165050],
    ["1650.50", 165050],
    ["$1,995.99", 199599],
    [" 850 ", 85000],
    ["0.01", 1],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseDollarsToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "12.345", "-5", "1e3", "1.2.3", "$", "12345678"])(
    "rejects %j",
    (input) => {
      expect(parseDollarsToCents(input)).toBeNull();
    },
  );
});

describe("centsToDollarsInput", () => {
  it("shows cents only when there are some", () => {
    expect(centsToDollarsInput(165000)).toBe("1650");
    expect(centsToDollarsInput(165005)).toBe("1650.05");
    expect(centsToDollarsInput(199550)).toBe("1995.50");
  });
});
