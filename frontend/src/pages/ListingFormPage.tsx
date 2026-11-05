import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../api/client";
import {
  createListing,
  getListing,
  getReferenceData,
  updateListing,
} from "../api/listings";
import type { Listing, ListingRequest, ReferenceData } from "../api/types";
import { useSession } from "../auth/session";
import { Button } from "../components/Button";
import { DeleteListingDialog } from "../components/DeleteListingDialog";
import { ListingForm } from "../components/ListingForm";
import { StatusMessage } from "../components/StatusMessage";

type Loaded =
  | { kind: "ready"; referenceData: ReferenceData; listing?: Listing }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

/** FR-02: "Post a room" (/listings/new) and "Edit listing" (/listings/:id/edit). */
export function ListingFormPage() {
  const { id } = useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const key = id ?? "new";
  const [loaded, setLoaded] = useState<{ key: string; value: Loaded } | null>(
    null,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getReferenceData(), id ? getListing(id) : null])
      .then(([referenceData, detail]): Loaded => {
        if (detail && detail.listing.landlordId !== user?.id) {
          return { kind: "not-found" };
        }
        return { kind: "ready", referenceData, listing: detail?.listing };
      })
      .catch((e: unknown): Loaded => {
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
          return { kind: "not-found" };
        }
        return {
          kind: "error",
          message:
            e instanceof ApiError ? e.body.message : "Something went wrong.",
        };
      })
      .then((value) => {
        if (active) setLoaded({ key, value });
      });
    return () => {
      active = false;
    };
  }, [id, key, user?.id]);

  if (!loaded || loaded.key !== key) {
    return <StatusMessage title="Loading…" />;
  }
  const { value } = loaded;
  if (value.kind === "not-found") {
    return (
      <StatusMessage title="Listing not found">
        <Link to="/my/listings">Back to my listings</Link>
      </StatusMessage>
    );
  }
  if (value.kind === "error") {
    return (
      <StatusMessage title="Could not load the form">
        <p>{value.message}</p>
      </StatusMessage>
    );
  }

  const editing = value.listing;
  async function save(request: ListingRequest) {
    const saved = editing
      ? await updateListing(editing.id, request)
      : await createListing(request);
    navigate(`/listings/${saved.id}`);
  }

  return (
    <section className="card">
      <h1>{editing ? "Edit listing" : "Post a room"}</h1>
      <ListingForm
        key={key}
        referenceData={value.referenceData}
        listing={editing}
        submitLabel={editing ? "Save changes" : "Post listing"}
        onSubmit={save}
      />
      {editing && (
        <div className="danger-zone">
          <div>
            <h2>Delete listing</h2>
            <p className="muted">Removes it permanently. Use Hide to take it offline for a while.</p>
          </div>
          <Button
            variant="secondary"
            className="button-danger-outline"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete listing
          </Button>
          <DeleteListingDialog
            listing={confirmingDelete ? editing : null}
            onCancel={() => setConfirmingDelete(false)}
            onDeleted={() => navigate("/my/listings", { replace: true })}
          />
        </div>
      )}
    </section>
  );
}
