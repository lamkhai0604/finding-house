import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { changeListingStatus, getMyListings } from "../api/listings";
import type { Listing } from "../api/types";
import { Button } from "../components/Button";
import { ButtonLink } from "../components/ButtonLink";
import { DeleteListingDialog } from "../components/DeleteListingDialog";
import { FormAlert } from "../components/FormAlert";
import { TicketGridSkeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { StatusMessage } from "../components/StatusMessage";
import { TicketCard } from "../components/TicketCard";
import { usePageTitle } from "../hooks/usePageTitle";
import { useToast } from "../toast/toast";

type Loaded =
  { kind: "ready"; listings: Listing[] } | { kind: "error"; message: string };

/** FR-02 AC3, AC6: a landlord's listings, including hidden ones, newest first. */
export function MyListingsPage() {
  usePageTitle("My listings");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Listing | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    getMyListings()
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

  async function toggleStatus(listing: Listing) {
    setBusyId(listing.id);
    setActionError(null);
    try {
      const updated = await changeListingStatus(
        listing.id,
        listing.status === "ACTIVE" ? "HIDDEN" : "ACTIVE",
      );
      toast.show(
        updated.status === "HIDDEN"
          ? `"${updated.title}" is hidden from Browse.`
          : `"${updated.title}" is back in Browse.`,
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
    return <TicketGridSkeleton count={3} />;
  }
  if (loaded.kind === "error") {
    return (
      <StatusMessage title="Could not load your listings">
        <p>{loaded.message}</p>
      </StatusMessage>
    );
  }

  const shown = loaded.listings.filter((l) => l.status === "ACTIVE").length;
  const hidden = loaded.listings.length - shown;

  return (
    <section className="my-listings">
      <div className="page-heading">
        <h1 className="display">My listings</h1>
        <ButtonLink to="/listings/new" variant="primary">
          Post a room
        </ButtonLink>
      </div>
      <FormAlert message={actionError} />
      {loaded.listings.length === 0 ? (
        <EmptyState title="No listings yet">
          <p>
            Post your first room so tenants can find it. It takes a few
            minutes.
          </p>
        </EmptyState>
      ) : (
        <>
          <dl className="listing-counts">
            <div>
              <dt>Rooms</dt>
              <dd className="display">{loaded.listings.length}</dd>
            </div>
            <div>
              <dt>Shown in Browse</dt>
              <dd className="display">{shown}</dd>
            </div>
            <div>
              <dt>Hidden</dt>
              <dd className="display">{hidden}</dd>
            </div>
          </dl>
          <ul className="ticket-grid">
            {loaded.listings.map((listing) => (
              <li key={listing.id}>
                <TicketCard
                  listing={listing}
                  headingLevel={2}
                  footer={
                    <>
                      <ButtonLink to={`/listings/${listing.id}/edit`}>
                        Edit
                      </ButtonLink>
                      <Button
                        variant="secondary"
                        busy={busyId === listing.id}
                        onClick={() => toggleStatus(listing)}
                      >
                        {listing.status === "ACTIVE" ? "Hide" : "Unhide"}
                      </Button>
                      <Button
                        variant="secondary"
                        className="button-danger-outline"
                        onClick={() => setToDelete(listing)}
                      >
                        Delete
                      </Button>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
      <DeleteListingDialog
        listing={toDelete}
        onCancel={() => setToDelete(null)}
        onDeleted={(id) => {
          if (toDelete) toast.show(`"${toDelete.title}" was deleted.`);
          setToDelete(null);
          setLoaded((current) =>
            current?.kind === "ready"
              ? {
                  kind: "ready",
                  listings: current.listings.filter((l) => l.id !== id),
                }
              : current,
          );
        }}
      />
    </section>
  );
}
