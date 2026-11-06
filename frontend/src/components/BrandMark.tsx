import { Link } from "react-router";

/** Logo (D-033): a stop on the line, and the product name, linking home. */
export function BrandMark() {
  return (
    <Link to="/" className="brand">
      <svg viewBox="0 0 34 34" width="32" height="32" aria-hidden="true">
        <rect className="brand-line" x="0" y="14" width="34" height="6" rx="3" />
        <circle className="brand-stop" cx="17" cy="17" r="9" strokeWidth="4" />
      </svg>
      Finding House
    </Link>
  );
}
