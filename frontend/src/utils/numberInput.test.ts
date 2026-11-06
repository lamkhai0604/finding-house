import { describe, expect, it } from "vitest";
import {
  AREA,
  MONEY,
  caretAfter,
  formatPlainNumber,
  significantBefore,
  toPlainNumber,
} from "./numberInput";

describe("number fields (T-207)", () => {
  it("keeps the plain value and shows thousands separators", () => {
    expect(toPlainNumber("$5,000", MONEY)).toBe("5000");
    expect(formatPlainNumber("5000")).toBe("5,000");
    expect(formatPlainNumber("1234567.5")).toBe("1,234,567.5");
    expect(formatPlainNumber("")).toBe("");
  });

  it("allows cents for money and whole numbers for area", () => {
    expect(toPlainNumber("1,995.50", MONEY)).toBe("1995.50");
    expect(toPlainNumber("1995.", MONEY)).toBe("1995.");
    expect(toPlainNumber(".5", MONEY)).toBe("0.5");
    expect(toPlainNumber("1995.505", MONEY)).toBeNull();
    expect(toPlainNumber("420.5", AREA)).toBe("4205");
  });

  it("refuses too many digits instead of cutting them off", () => {
    expect(toPlainNumber("12345678", MONEY)).toBeNull();
    expect(toPlainNumber("200000000", AREA)).toBeNull();
    expect(toPlainNumber("999999", AREA)).toBe("999999");
  });

  it("drops letters, spaces, and leading zeros", () => {
    expect(toPlainNumber("a lot", MONEY)).toBe("");
    expect(toPlainNumber(" 0042 sq ft", AREA)).toBe("42");
    expect(toPlainNumber("0", AREA)).toBe("0");
  });

  it("puts the caret back after the same digit once commas move", () => {
    // Typing the 4th digit of "1234": the caret was after "4" in "1234".
    const typed = "1234";
    const count = significantBefore(typed, 4);
    expect(caretAfter(formatPlainNumber("1234"), count)).toBe(5); // "1,234|"
    // Deleting inside "12,345" -> "1,345" with the caret after "1".
    expect(caretAfter("1,345", significantBefore("1,345", 1))).toBe(1);
    expect(caretAfter("5,000", 0)).toBe(0);
  });
});
