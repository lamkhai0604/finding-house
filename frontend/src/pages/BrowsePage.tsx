import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError } from "../api/client";
import { getReferenceData, searchListings } from "../api/listings";
import type { Listing, Page, ReferenceData } from "../api/types";
import { useSession } from "../auth/session";
import {
  filtersFromParams,
  filtersToParams,
  toSearch,
  type FilterErrors,
  type FilterValues,
} from "../browse/filters";
import { Button } from "../components/Button";
import { FavoriteButton } from "../components/FavoriteButton";
import { FormAlert } from "../components/FormAlert";
import { ListingCard } from "../components/ListingCard";
import { ListingFilters } from "../components/ListingFilters";
import { Pagination } from "../components/Pagination";
import { ListingListSkeleton } from "../components/Skeleton";

type Results =
  | { key: string; kind: "ready"; page: Page<Listing> }
  | { key: string; kind: "error"; message: string };

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const field = e.body.fieldErrors[0];
    return field ? `${field.field}: ${field.message}` : e.body.message;
  }
  return "Could not reach the server. Please try again.";
}

/** FR-03 / T-202: browse active listings with filters, sorting, and pages. */
export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const { status } = useSession();
  const sessionKnown = status !== "loading";
  const queryKey = params.toString();

  const parsed = useMemo(() => {
    const fromUrl = filtersFromParams(new URLSearchParams(queryKey));
    const checked = toSearch(fromUrl.values, fromUrl.page);
    const errors: FilterErrors = { ...checked.errors };
    if (fromUrl.unknownAmenities.length > 0) {
      errors.amenities = `Unknown amenity in the link: ${fromUrl.unknownAmenities.join(", ")}`;
    }
    return { ...fromUrl, search: checked.search, errors };
  }, [queryKey]);

  // T-205: on small screens the panel folds behind a "Filters" button. It belongs to the URL it was
  // opened on, so applying filters (a new URL) folds it again; invalid filters keep it open.
  const [filtersOpenOn, setFiltersOpenOn] = useState<string | null>(null);
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    let active = true;
    getReferenceData()
      .then((data) => {
        if (active) setReference(data);
      })
      // Without the lists the panel still works with "Any"; results show their own errors.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Wait for a stored token to be checked (see HomePage), and never send invalid filters.
    if (!sessionKnown || !parsed.search) return;
    let active = true;
    searchListings(parsed.search)
      .then((page): Results => ({ key: queryKey, kind: "ready", page }))
      .catch((e: unknown): Results => ({
        key: queryKey,
        kind: "error",
        message: errorMessage(e),
      }))
      .then((value) => {
        if (active) setResults(value);
      });
    return () => {
      active = false;
    };
  }, [sessionKnown, parsed.search, queryKey]);

  function apply(values: FilterValues): FilterErrors {
    const { errors } = toSearch(values);
    if (Object.keys(errors).length === 0) {
      setParams(filtersToParams(values));
    }
    return errors;
  }

  function goToPage(page: number) {
    setParams(filtersToParams(parsed.values, page));
    document.querySelector(".browse-results")?.scrollIntoView?.();
  }

  const current = results?.key === queryKey ? results : null;
  const invalid = Object.keys(parsed.errors).length > 0;
  const filtersOpen = invalid || filtersOpenOn === queryKey;
  const { values } = parsed;
  const activeFilters =
    [
      values.neighborhood,
      values.minPrice,
      values.maxPrice,
      values.minArea,
    ].filter((v) => v.trim() !== "").length + values.amenities.length;

  return (
    <section className="browse">
      <div className="page-heading">
        <h1>Browse rooms</h1>
      </div>
      <Button
        variant="secondary"
        className="filter-toggle"
        aria-expanded={filtersOpen}
        aria-controls="browse-filters"
        onClick={() => setFiltersOpenOn(filtersOpen ? null : queryKey)}
      >
        {filtersOpen ? "Hide filters" : "Filters"}
        {activeFilters > 0 && ` (${activeFilters} active)`}
      </Button>
      <div className="browse-layout">
        <div
          id="browse-filters"
          className={filtersOpen ? "filter-wrap open" : "filter-wrap"}
        >
          <ListingFilters
            // A new URL (Back, a pasted link, or "Clear") resets the form to match it.
            key={queryKey}
            initial={parsed.values}
            initialErrors={parsed.errors}
            neighborhoods={reference?.neighborhoods ?? []}
            amenities={reference?.amenities ?? parsed.values.amenities}
            onApply={apply}
          />
        </div>
        <div className="browse-results">
          {invalid ? (
            <FormAlert message="Some filters are not valid. Fix them and press Show rooms." />
          ) : !current ? (
            <ListingListSkeleton />
          ) : current.kind === "error" ? (
            <FormAlert message={current.message} />
          ) : current.page.totalItems === 0 ? (
            <div className="empty-results" role="status">
              {activeFilters > 0 ? (
                <>
                  <h2>No rooms match these filters</h2>
                  <p className="muted">
                    Try a wider price range, another neighborhood, or fewer
                    amenities.
                  </p>
                </>
              ) : (
                <>
                  <h2>No rooms have been posted yet</h2>
                  <p className="muted">Check back soon.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="results-count" role="status">
                {current.page.totalItems === 1
                  ? "1 room found"
                  : `${current.page.totalItems} rooms found`}
              </p>
              {current.page.items.length === 0 ? (
                <p className="muted">This page is empty.</p>
              ) : (
                <div className="listing-list">
                  {current.page.items.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      actions={
                        <FavoriteButton
                          listingId={listing.id}
                          title={listing.title}
                        />
                      }
                    />
                  ))}
                </div>
              )}
              <Pagination
                page={parsed.page}
                totalPages={current.page.totalPages}
                onChange={goToPage}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
