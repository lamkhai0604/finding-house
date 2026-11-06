import { useState } from "react";
import { useLocation } from "react-router";
import { ApiError } from "../api/client";
import { useSession } from "../auth/session";
import { useFavorites } from "../favorites/favorites";
import { Button } from "./Button";
import { ButtonLink } from "./ButtonLink";

interface FavoriteButtonProps {
  listingId: number;
  /** Used in the accessible name, e.g. "Save Sunny studio near UW". */
  title: string;
}

/**
 * T-403 / FR-06: save or unsave a room. Tenants get a toggle; visitors get a link to log in that
 * comes back to this page; landlords see nothing (they cannot save rooms).
 */
export function FavoriteButton({ listingId, title }: FavoriteButtonProps) {
  const favorites = useFavorites();
  const { user } = useSession();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  if (!user) {
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
