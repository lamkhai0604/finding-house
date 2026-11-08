import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../api/client";
import {
  dismissReports,
  getModerationActions,
  getRemovedListings,
  getReportQueue,
  reasonLabel,
  removeListing,
  restoreListing,
} from "../api/moderation";
import type {
  ModerationActionItem,
  ModerationListing,
  ReportGroup,
  ReportReason,
} from "../api/types";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageLoading } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { StatusMessage } from "../components/StatusMessage";
import { usePageTitle } from "../hooks/usePageTitle";
import { useToast } from "../toast/toast";
import { formatPostedAgo } from "../utils/postedAgo";

interface Data {
  queue: ReportGroup[];
  removed: ModerationListing[];
  actions: ModerationActionItem[];
}

type Pending =
  | { kind: "remove"; listing: ModerationListing; suggested: string }
  | { kind: "dismiss"; listing: ModerationListing }
  | { kind: "restore"; listing: ModerationListing }
  | null;

const REASON_LIMIT = 200;
const ACTION_LABEL = { REMOVE: "Removed", RESTORE: "Restored", DISMISS: "Dismissed" };

/** FR-08 AC2 to AC4: the report queue, removed listings and the moderation record. */
export function AdminPage() {
  usePageTitle("Moderation");
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  // Bumped after every action, so the effect loads the queue again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getReportQueue(), getRemovedListings(), getModerationActions()])
      .then(([queue, removed, actions]) => {
        if (!active) return;
        setData({ queue, removed, actions });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof ApiError ? e.body.message : "Could not load moderation.");
      });
    return () => {
      active = false;
    };
  }, [version]);

  if (error && !data) {
    return (
      <StatusMessage title="Could not load moderation">
        <p>{error}</p>
      </StatusMessage>
    );
  }
  if (!data) {
    return (
      <PageLoading label="Loading reports">
        <Spinner size="2rem" />
      </PageLoading>
    );
  }

  function done(message: string) {
    setPending(null);
    toast.show(message);
    setVersion((v) => v + 1);
  }

  return (
    <section className="admin-page">
      <div className="page-heading">
        <h1 className="display">Moderation</h1>
      </div>

      <section className="admin-section" aria-labelledby="admin-reports">
        <h2 id="admin-reports" className="display">
          Reported listings <span className="admin-count">{data.queue.length}</span>
        </h2>
        {data.queue.length === 0 ? (
          <EmptyState title="No open reports">
            <p>New reports from visitors will appear here.</p>
          </EmptyState>
        ) : (
          <ul className="report-list">
            {data.queue.map((group) => (
              <li key={group.listing.id}>
                <ReportCard
                  group={group}
                  onRemove={() =>
                    setPending({
                      kind: "remove",
                      listing: group.listing,
                      suggested: reasonLabel(topReason(group)),
                    })
                  }
                  onDismiss={() => setPending({ kind: "dismiss", listing: group.listing })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section" aria-labelledby="admin-removed">
        <h2 id="admin-removed" className="display">
          Removed listings <span className="admin-count">{data.removed.length}</span>
        </h2>
        {data.removed.length === 0 ? (
          <p className="muted">Nothing has been removed.</p>
        ) : (
          <ul className="removed-list">
            {data.removed.map((listing) => (
              <li key={listing.id} className="removed-row">
                <div>
                  <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
                  <p className="muted">
                    {listing.neighborhood} · {listing.landlordName} · {listing.removedReason}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setPending({ kind: "restore", listing })}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section" aria-labelledby="admin-actions">
        <h2 id="admin-actions" className="display">
          Recent actions
        </h2>
        {data.actions.length === 0 ? (
          <p className="muted">No moderation actions yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Action</th>
                  <th scope="col">Listing</th>
                  <th scope="col">Reason</th>
                  <th scope="col">By</th>
                </tr>
              </thead>
              <tbody>
                {data.actions.map((action) => (
                  <tr key={action.id}>
                    <td>{formatPostedAgo(action.createdAt)}</td>
                    <td>{ACTION_LABEL[action.action]}</td>
                    <td>{action.listingTitle}</td>
                    <td>{action.reason ?? "—"}</td>
                    <td>{action.adminName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pending?.kind === "remove" && (
        <RemoveDialog
          listing={pending.listing}
          suggested={pending.suggested}
          onCancel={() => setPending(null)}
          onRemoved={() => done(`"${pending.listing.title}" was removed.`)}
        />
      )}
      <ConfirmDialog
        open={pending?.kind === "dismiss"}
        title="Dismiss these reports?"
        confirmLabel="Dismiss reports"
        tone="primary"
        onConfirm={async () => {
          if (pending?.kind !== "dismiss") return;
          await run(() => dismissReports(pending.listing.id));
          done(`Reports on "${pending.listing.title}" were dismissed.`);
        }}
        onCancel={() => setPending(null)}
      >
        <p>
          <strong>{pending?.listing.title}</strong> stays online and its open
          reports are closed. This is recorded.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={pending?.kind === "restore"}
        title="Restore this listing?"
        confirmLabel="Restore"
        tone="primary"
        onConfirm={async () => {
          if (pending?.kind !== "restore") return;
          await run(() => restoreListing(pending.listing.id));
          done(`"${pending.listing.title}" was restored as hidden.`);
        }}
        onCancel={() => setPending(null)}
      >
        <p>
          <strong>{pending?.listing.title}</strong> comes back hidden, so its
          landlord can check it and show it again. This is recorded.
        </p>
      </ConfirmDialog>
    </section>
  );
}

function ReportCard({
  group,
  onRemove,
  onDismiss,
}: {
  group: ReportGroup;
  onRemove: () => void;
  onDismiss: () => void;
}) {
  const { listing } = group;
  const notes = group.reports.filter((r) => r.note).slice(0, 3);
  return (
    <article className="report-card">
      <div className="report-head">
        <h3>
          <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
        </h3>
        <span className="report-total">
          {group.reportCount} {group.reportCount === 1 ? "report" : "reports"}
        </span>
      </div>
      <p className="muted">
        {listing.neighborhood} · {listing.landlordName}
        {listing.status === "HIDDEN" ? " · hidden by its owner" : ""} · latest{" "}
        {formatPostedAgo(group.latestReportAt)}
      </p>
      <ul className="report-reasons-summary" aria-label="Reasons">
        {(Object.entries(group.reasons) as [ReportReason, number][]).map(
          ([reason, count]) => (
            <li key={reason} className="tag">
              {reasonLabel(reason)}
              {count > 1 ? ` ×${count}` : ""}
            </li>
          ),
        )}
      </ul>
      {notes.length > 0 && (
        <ul className="report-notes">
          {notes.map((r, i) => (
            <li key={i}>
              <span className="muted">{reasonLabel(r.reason)}:</span> {r.note}
            </li>
          ))}
        </ul>
      )}
      <div className="report-actions">
        <Button variant="secondary" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button variant="danger" onClick={onRemove}>
          Remove listing
        </Button>
      </div>
    </article>
  );
}

function RemoveDialog({
  listing,
  suggested,
  onCancel,
  onRemoved,
}: {
  listing: ModerationListing;
  suggested: string;
  onCancel: () => void;
  onRemoved: () => void;
}) {
  const reasonId = useId();
  const [reason, setReason] = useState(suggested);
  return (
    <ConfirmDialog
      open
      title="Remove this listing?"
      confirmLabel="Remove listing"
      tone="danger"
      confirmDisabled={reason.trim() === ""}
      onConfirm={async () => {
        await run(() => removeListing(listing.id, reason.trim()));
        onRemoved();
      }}
      onCancel={onCancel}
    >
      <p>
        <strong>{listing.title}</strong> disappears from Browse and saved rooms.
        Its landlord sees the reason below and cannot bring it back; you can
        restore it later.
      </p>
      <div className="field">
        <label htmlFor={reasonId}>Reason shown to the landlord</label>
        <textarea
          id={reasonId}
          rows={2}
          maxLength={REASON_LIMIT}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}

function topReason(group: ReportGroup): ReportReason {
  const entries = Object.entries(group.reasons) as [ReportReason, number][];
  return entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

/** Turns an API error into the message ConfirmDialog shows. */
async function run(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (e) {
    throw new Error(e instanceof ApiError ? e.body.message : "Something went wrong.", {
      cause: e,
    });
  }
}
