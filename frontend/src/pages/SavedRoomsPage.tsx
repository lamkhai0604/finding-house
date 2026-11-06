import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { getFavorites } from "../api/favorites";
import type { Listing } from "../api/types";
import { ButtonLink } from "../components/ButtonLink";
import { FavoriteButton } from "../components/FavoriteButton";
import { ListingCard } from "../components/ListingCard";
import { ListingListSkeleton } from "../components/Skeleton";
import { StatusMessage } from "../components/StatusMessage";
import { useFavorites } from "../favorites/favorites";

type Loaded =
  | { kind: "ready"; listings: Listing[] }
  | { kind: "error"; message: string };

/** FR-06: a tenant's saved rooms. Unsaving a room removes it from the list at once. */
export function SavedRoomsPage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const favorites = useFavorites();

  useEffect(() => {
    let active = true;
    getFavorites()
      .then((listings): Loaded => ({ kind: "ready", listings }))
      .catch((e: unknown): Loaded => ({
        kind: "error",
        message:
          e instanceof ApiError ? e.body.message : "Something went wrong.",
      }))
      .then((value) => {
        if (active) setLoaded(value);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return <ListingListSkeleton />;
  }
  if (loaded.kind === "error") {
    return (
      <StatusMessage title="Could not load your saved rooms">
        <p>{loaded.message}</p>
      </StatusMessage>
    );
  }

  // Until the saved list has loaded, show everything the server returned.
  const shown = favorites.ready
    ? loaded.listings.filter((l) => favorites.isSaved(l.id))
    : loaded.listings;
  return (
    <section>
      <div className="page-heading">
        <h1>Saved rooms</h1>
        <ButtonLink to="/browse">Browse rooms</ButtonLink>
      </div>
      {shown.length === 0 ? (
        <div className="empty-results" role="status">
          <h2>No saved rooms yet</h2>
          <p className="muted">
            Press Save on a room you like and it will show up here.
          </p>
        </div>
      ) : (
        <div className="listing-list">
          {shown.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              actions={
                <FavoriteButton listingId={listing.id} title={listing.title} />
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
