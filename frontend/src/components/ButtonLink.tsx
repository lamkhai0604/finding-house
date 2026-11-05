import { Link, type LinkProps } from "react-router";
import { buttonClassName, type ButtonVariant } from "./buttonStyles";

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
}

/**
 * Navigation that looks like a button (D-027). It stays a real link, so it can be opened in a new
 * tab and screen readers announce it as a link; actions use <Button> instead.
 */
export function ButtonLink({
  variant = "secondary",
  className,
  ...rest
}: ButtonLinkProps) {
  return <Link {...rest} className={buttonClassName(variant, className)} />;
}
