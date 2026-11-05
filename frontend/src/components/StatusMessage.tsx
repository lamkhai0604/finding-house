import type { ReactNode } from "react";

interface StatusMessageProps {
  title: string;
  children?: ReactNode;
}

/** Full-page state such as "Loading…", "Listing not found", or an error. */
export function StatusMessage({ title, children }: StatusMessageProps) {
  return (
    <section className="status-message" aria-live="polite">
      <h1>{title}</h1>
      {children}
    </section>
  );
}
