import type { ButtonHTMLAttributes, Ref } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  ref?: Ref<HTMLButtonElement>;
  /** Disables the button and shows the label as busy while a request runs. */
  busy?: boolean;
}

export function Button({
  variant = "primary",
  busy = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={["button", `button-${variant}`, className]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {children}
    </button>
  );
}
