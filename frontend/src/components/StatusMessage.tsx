import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

interface StatusMessageProps {
  title: string;
  children?: ReactNode;
}

/** Full-page state such as "Listing not found" or an error, shown as a T-214 empty state. */
export function StatusMessage({ title, children }: StatusMessageProps) {
  return (
    <EmptyState title={title} headingLevel={1}>
      {children}
    </EmptyState>
  );
}
