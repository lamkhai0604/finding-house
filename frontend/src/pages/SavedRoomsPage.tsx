import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { getFavorites } from "../api/favorites";
import type { Listing } from "../api/types";
import { ButtonLink } from "../components/ButtonLink";
import { FavoriteButton } from "../components/FavoriteButton";
import { TicketGridSkeleton } from "../components/Skeleton";
import { TicketCard } from "../components/TicketCard";
import { EmptyState } from "../components/EmptyState";
import { StatusMessage } from "../components/StatusMessage";
import { useFavorites } from "../favorites/favorites";
import { usePageTitle } from "../hooks/usePageTitle";

type Loaded =
  { kind: "ready"; listings: Listing[] } | { kind: "error"; message: string };

/** FR-06: a tenant's saved rooms. Unsaving a room removes it from the list at once. */
export function SavedRoomsPage() {
  usePageTitle("Saved rooms");
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
    return <TicketGridSkeleton count={3} />;
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
        <EmptyState title="No saved rooms yet">
          <p>Tap the heart on a room you like and it will show up here.</p>
          <div className="empty-actions">
            <ButtonLink to="/browse" variant="primary">
              Browse rooms
            </ButtonLink>
          </div>
        </EmptyState>
      ) : (
        <ul className="ticket-grid">
          {shown.map((listing) => (
            <li key={listing.id}>
              <TicketCard
                listing={listing}
                headingLevel={2}
                action={
                  <FavoriteButton
                    listingId={listing.id}
                    title={listing.title}
                    compact
                  />
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
