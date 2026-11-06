/**
 * T-207: numbers typed into price and area fields. The field shows "5,000" while the app keeps the
 * plain value "5000", so parsing (parseDollarsToCents, whole square feet) and the URL stay simple.
 */
export interface NumberFormat {
  /** Digits allowed after the decimal point (0 = whole numbers only). */
  decimals: number;
  /** Most digits allowed before the decimal point. */
  maxIntegerDigits: number;
}

export const MONEY: NumberFormat = { decimals: 2, maxIntegerDigits: 7 };
export const AREA: NumberFormat = { decimals: 0, maxIntegerDigits: 6 };

/**
 * Keeps digits and at most one decimal point, within the format's limits. Returns null when the
 * input has too many digits, so the field can refuse the keystroke instead of cutting digits off.
 */
export function toPlainNumber(input: string, format: NumberFormat): string | null {
  let digitsAndPoint = input.replace(/[^\d.]/g, "");
  if (format.decimals === 0) {
    digitsAndPoint = digitsAndPoint.replace(/\./g, "");
  }
  const point = digitsAndPoint.indexOf(".");
  let whole = point === -1 ? digitsAndPoint : digitsAndPoint.slice(0, point);
  const fraction =
    point === -1 ? null : digitsAndPoint.slice(point + 1).replace(/\./g, "");

  whole = whole.replace(/^0+(?=\d)/, "");
  if (whole.length > format.maxIntegerDigits) return null;
  if (fraction !== null && fraction.length > format.decimals) return null;
  if (fraction === null) return whole;
  return `${whole === "" ? "0" : whole}.${fraction}`;
}

/** "1995.5" -> "1,995.5"; "" -> "". Accepts already-formatted text as well. */
export function formatPlainNumber(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  if (cleaned === "") return "";
  const point = cleaned.indexOf(".");
  const whole = point === -1 ? cleaned : cleaned.slice(0, point);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return point === -1 ? grouped : `${grouped}.${cleaned.slice(point + 1)}`;
}

/** How many digits or points come before `position` in `text` (commas and spaces ignored). */
export function significantBefore(text: string, position: number): number {
  return text.slice(0, position).replace(/[^\d.]/g, "").length;
}

/** The caret position in `formatted` that sits after `count` digits or points. */
export function caretAfter(formatted: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d.]/.test(formatted[i])) seen += 1;
    if (seen === count) return i + 1;
  }
  return formatted.length;
}
