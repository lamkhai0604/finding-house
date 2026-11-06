import type { ButtonHTMLAttributes, Ref } from "react";
import { useDelayedFlag } from "../hooks/useDelayedFlag";
import { useLoadingSignal } from "../loading/loading";
import { buttonClassName, type ButtonVariant } from "./buttonStyles";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  ref?: Ref<HTMLButtonElement>;
  /** Disables the button at once and shows a spinner if the request takes a while (D-027). */
  busy?: boolean;
}

export function Button({
  variant = "primary",
  busy = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const showSpinner = useDelayedFlag(busy);
  // T-217: a busy button is waiting for the server too (e.g. logging in while it wakes up).
  useLoadingSignal(busy);
  return (
    <button
      {...rest}
      type={type}
      className={buttonClassName(variant, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {showSpinner && <Spinner />}
      {children}
    </button>
  );
}
