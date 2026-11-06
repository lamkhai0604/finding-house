import type { ReactNode } from "react";
import { useDelayedFlag } from "../hooks/useDelayedFlag";

/** Grey placeholder block with a gentle shimmer. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={["skeleton", className].filter(Boolean).join(" ")} />;
}

/**
 * Loading state for a page (D-027): announces itself to screen readers at once, but only shows the
 * skeleton after ~200 ms so fast loads do not flicker.
 */
export function PageLoading({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const visible = useDelayedFlag(true);
  return (
    <div role="status" aria-label={label} aria-busy="true">
      {visible && children}
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <PageLoading label="Loading listing">
      <Skeleton className="skeleton-photo" />
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-line short" />
      <Skeleton className="skeleton-line" />
      <Skeleton className="skeleton-line" />
      <Skeleton className="skeleton-box" />
    </PageLoading>
  );
}

export function ListingListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <PageLoading label="Loading listings">
      <div className="listing-list">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="listing-card">
            <Skeleton className="skeleton-thumb" />
            <div>
              <Skeleton className="skeleton-title" />
              <Skeleton className="skeleton-line short" />
              <Skeleton className="skeleton-line" />
            </div>
          </div>
        ))}
      </div>
    </PageLoading>
  );
}

/** Placeholder for a grid of ticket cards while listings load (T-210). */
export function TicketGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <PageLoading label="Loading rooms">
      <div className="ticket-grid">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="ticket">
            <Skeleton className="skeleton-photo" />
            <div className="ticket-stub">
              <Skeleton className="skeleton-line short" />
              <Skeleton className="skeleton-line" />
            </div>
          </div>
        ))}
      </div>
    </PageLoading>
  );
}

export function FormSkeleton() {
  return (
    <PageLoading label="Loading form">
      <div className="card">
        <Skeleton className="skeleton-title" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="skeleton-input" />
        ))}
      </div>
    </PageLoading>
  );
}
