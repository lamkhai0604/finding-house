import { Button } from "./Button";

interface PaginationProps {
  /** 1-based. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Previous / Next with "Page X of Y" (T-202). Renders nothing for a single page. */
export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <nav className="pagination" aria-label="Pages">
      <Button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Previous
      </Button>
      <span aria-current="page">
        Page {page} of {totalPages}
      </span>
      <Button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next ›
      </Button>
    </nav>
  );
}
