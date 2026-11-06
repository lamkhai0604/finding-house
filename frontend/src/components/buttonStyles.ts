export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

/** Shared classes so links styled as buttons look exactly like buttons (D-027). */
export function buttonClassName(
  variant: ButtonVariant,
  className?: string,
): string {
  return ["button", `button-${variant}`, className].filter(Boolean).join(" ");
}
