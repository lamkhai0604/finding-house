import { useId, useState } from "react";
import { ApiError } from "../api/client";
import { REPORT_REASONS, reportListing } from "../api/moderation";
import type { ReportReason } from "../api/types";
import { ConfirmDialog } from "./ConfirmDialog";

interface ReportListingDialogProps {
  open: boolean;
  listingId: number;
  title: string;
  onCancel: () => void;
  onReported: () => void;
}

const NOTE_LIMIT = 500;

/** FR-08 AC1: a reason (required) and an optional note, sent to the moderators. */
export function ReportListingDialog({
  open,
  listingId,
  title,
  onCancel,
  onReported,
}: ReportListingDialogProps) {
  const name = useId();
  const noteId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");

  async function send() {
    if (!reason) return;
    try {
      await reportListing(listingId, reason, note);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        throw new Error(
          "You already reported this listing. A moderator will look at it.",
          {
            cause: e,
          },
        );
      }
      throw new Error(
        e instanceof ApiError ? e.body.message : "Could not send the report.",
        { cause: e },
      );
    }
    setReason(null);
    setNote("");
    onReported();
  }

  return (
    <ConfirmDialog
      open={open}
      title="Report this listing"
      confirmLabel="Send report"
      tone="primary"
      confirmDisabled={reason === null}
      onConfirm={send}
      onCancel={onCancel}
    >
      <p>
        Tell the moderators what is wrong with <strong>{title}</strong>. The
        landlord does not see who reported it.
      </p>
      <fieldset className="report-reasons">
        <legend>Reason</legend>
        {REPORT_REASONS.map((option) => (
          <label key={option.value} className="report-reason">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={reason === option.value}
              onChange={() => setReason(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor={noteId}>Details (optional)</label>
        <textarea
          id={noteId}
          rows={3}
          maxLength={NOTE_LIMIT}
          aria-describedby={`${noteId}-hint`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p id={`${noteId}-hint`} className="field-hint">
          {note.length}/{NOTE_LIMIT}. Please do not include phone numbers or
          other personal details.
        </p>
      </div>
    </ConfirmDialog>
  );
}
