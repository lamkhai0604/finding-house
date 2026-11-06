import { Link } from "react-router";

/** Logo: a small house icon and the product name, linking home. */
export function BrandMark() {
  return (
    <Link to="/" className="brand">
      <svg
        className="brand-icon"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        aria-hidden="true"
      >
        <path
          d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
          fill="currentColor"
        />
      </svg>
      Finding House
    </Link>
  );
}
