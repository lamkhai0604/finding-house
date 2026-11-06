import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  /** h1 for a whole page (404, not found), h2 inside a page (no results). */
  headingLevel?: 1 | 2;
  children?: ReactNode;
}

/**
 * T-214: an empty or "not here" state with a small end-of-the-line drawing, in the Lagoon look.
 * The drawing is decoration only; the heading and text carry the message.
 */
export function EmptyState({
  title,
  headingLevel = 2,
  children,
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className="empty-state" aria-live="polite">
      <svg
        className="empty-art"
        viewBox="0 0 220 60"
        width="220"
        height="60"
        aria-hidden="true"
      >
        <path className="empty-track" d="M10 30 H150" />
        <path className="empty-dash" d="M150 30 H200" />
        <circle className="empty-stop" cx="40" cy="30" r="9" />
        <circle className="empty-stop" cx="95" cy="30" r="9" />
        <circle className="empty-stop here" cx="150" cy="30" r="11" />
        <rect className="empty-end" x="200" y="16" width="6" height="28" rx="3" />
      </svg>
      <Heading className="display">{title}</Heading>
      {children}
    </section>
  );
}
