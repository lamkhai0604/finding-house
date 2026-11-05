import { ApiError } from "../api/client";
import { deleteListing } from "../api/listings";
import type { Listing } from "../api/types";
import { ConfirmDialog } from "./ConfirmDialog";

interface DeleteListingDialogProps {
  /** The listing to delete; the dialog is closed when this is null. */
  listing: Pick<Listing, "id" | "title"> | null;
  onCancel: () => void;
  onDeleted: (id: number) => void;
}

/** FR-07: asks before permanently deleting a listing, then deletes it. */
export function DeleteListingDialog({
  listing,
  onCancel,
  onDeleted,
}: DeleteListingDialogProps) {
  async function confirm() {
    if (!listing) return;
    try {
      await deleteListing(listing.id);
    } catch (e) {
      throw new Error(
        e instanceof ApiError ? e.body.message : "Could not delete the listing.",
      );
    }
    onDeleted(listing.id);
  }

  return (
    <ConfirmDialog
      open={listing !== null}
      title="Delete this listing?"
      confirmLabel="Delete listing"
      tone="danger"
      onConfirm={confirm}
      onCancel={onCancel}
    >
      <p>
        <strong>{listing?.title}</strong> will be removed permanently, with its
        photos and amenities. This cannot be undone.
      </p>
      <p className="muted">To take it offline for a while, use Hide instead.</p>
    </ConfirmDialog>
  );
}
