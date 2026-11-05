const DOLLARS = /^(\d{1,7})(?:\.(\d{1,2}))?$/;

/**
 * Parses what a landlord types as a monthly price ("1650", "$1,995.50") into integer cents,
 * without floating-point math. Returns null for anything that is not a valid amount.
 */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "").replaceAll(",", "");
  const match = DOLLARS.exec(cleaned);
  if (!match) {
    return null;
  }
  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  return dollars * 100 + cents;
}

/** 165000 -> "1650"; 199550 -> "1995.50" — the value shown in an edit form. */
export function centsToDollarsInput(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0
    ? String(dollars)
    : `${dollars}.${String(rest).padStart(2, "0")}`;
}
