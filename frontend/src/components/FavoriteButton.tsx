import { useState } from "react";
import { Link, useLocation } from "react-router";
import { ApiError } from "../api/client";
import { useSession } from "../auth/session";
import { useFavorites } from "../favorites/favorites";
import { Button } from "./Button";
import { ButtonLink } from "./ButtonLink";

interface FavoriteButtonProps {
  listingId: number;
  /** Used in the accessible name, e.g. "Save Sunny studio near UW". */
  title: string;
  /** T-211: a round heart for the corner of a ticket's photo instead of a labelled button. */
  compact?: boolean;
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

/**
 * T-403 / FR-06: save or unsave a room. Tenants get a toggle; visitors get a link to log in that
 * comes back to this page; landlords see nothing (they cannot save rooms).
 */
export function FavoriteButton({
  listingId,
  title,
  compact = false,
}: FavoriteButtonProps) {
  const favorites = useFavorites();
  const { user } = useSession();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    if (compact) {
      return (
        <Link
          to="/login"
          state={{ from: location.pathname + location.search }}
          className="save-heart"
          aria-label={`Log in to save ${title}`}
        >
          <Heart filled={false} />
        </Link>
      );
    }
    return (
      <ButtonLink
        to="/login"
        state={{ from: location.pathname + location.search }}
        aria-label={`Log in to save ${title}`}
      >
        <span aria-hidden="true">♡</span> Save
      </ButtonLink>
    );
  }
  if (!favorites.enabled) {
    return null;
  }

  const saved = favorites.isSaved(listingId);
  async function toggle() {
    setError(null);
    try {
      await favorites.toggle(listingId);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.body.message : "Could not update. Try again.",
      );
    }
  }

  if (compact) {
    return (
      <span className="favorite favorite-compact">
        <button
          type="button"
          className={saved ? "save-heart saved" : "save-heart"}
          aria-pressed={saved}
          aria-label={`Save ${title}`}
          onClick={toggle}
        >
          <Heart filled={saved} />
          <span className="sr-only">{saved ? "Saved" : "Save"}</span>
        </button>
        {error && (
          <span role="alert" className="save-error">
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="favorite">
      <Button
        variant="secondary"
        className={saved ? "favorite-button saved" : "favorite-button"}
        aria-pressed={saved}
        aria-label={`Save ${title}`}
        onClick={toggle}
      >
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span>{" "}
        {saved ? "Saved" : "Save"}
      </Button>
      {error && (
        <span role="alert" className="field-error">
          {error}
        </span>
      )}
    </span>
  );
}
