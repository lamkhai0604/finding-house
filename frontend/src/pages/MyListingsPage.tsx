import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../api/client";
import { changeListingStatus, getMyListings } from "../api/listings";
import type { Listing } from "../api/types";
import { Button } from "../components/Button";
import { FormAlert } from "../components/FormAlert";
import { ListingCard } from "../components/ListingCard";
import { StatusMessage } from "../components/StatusMessage";

type Loaded = { kind: "ready"; listings: Listing[] } | { kind: "error"; message: string };

/** FR-02 AC3, AC6: a landlord's listings, including hidden ones, newest first. */
export function MyListingsPage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyListings()
      .then((listings): Loaded => ({ kind: "ready", listings }))
      .catch(
        (e: unknown): Loaded => ({
          kind: "error",
          message:
            e instanceof ApiError ? e.body.message : "Something went wrong.",
        }),
      )
      .then((value) => {
        if (active) setLoaded(value);
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggleStatus(listing: Listing) {
    setBusyId(listing.id);
    setActionError(null);
    try {
      const updated = await changeListingStatus(
        listing.id,
        listing.status === "ACTIVE" ? "HIDDEN" : "ACTIVE",
      );
      setLoaded((current) =>
        current?.kind === "ready"
          ? {
              kind: "ready",
              listings: current.listings.map((l) =>
                l.id === updated.id ? updated : l,
              ),
            }
          : current,
      );
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.body.message : "Something went wrong.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!loaded) {
    return <StatusMessage title="Loading your listings…" />;
  }
  if (loaded.kind === "error") {
    return (
      <StatusMessage title="Could not load your listings">
        <p>{loaded.message}</p>
      </StatusMessage>
    );
  }

  return (
    <section>
      <div className="page-heading">
        <h1>My listings</h1>
        <Link to="/listings/new" className="button button-primary">
          Post a room
        </Link>
      </div>
      <FormAlert message={actionError} />
      {loaded.listings.length === 0 ? (
        <StatusMessage title="No listings yet">
          <p>Post your first room so tenants can find it.</p>
        </StatusMessage>
      ) : (
        <div className="listing-list">
          {loaded.listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              actions={
                <>
                  <Link
                    to={`/listings/${listing.id}/edit`}
                    className="button button-secondary"
                  >
                    Edit
                  </Link>
                  <Button
                    variant="secondary"
                    busy={busyId === listing.id}
                    onClick={() => toggleStatus(listing)}
                  >
                    {listing.status === "ACTIVE" ? "Hide" : "Unhide"}
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
