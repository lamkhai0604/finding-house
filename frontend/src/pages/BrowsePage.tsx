import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import type { AiSearchState } from "../ai/aiSearch";
import { ApiError } from "../api/client";
import { getReferenceData, searchListings } from "../api/listings";
import type { Listing, ListingSort, Page, ReferenceData } from "../api/types";
import { useSession } from "../auth/session";
import {
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  SORT_OPTIONS,
  toSearch,
  type FilterErrors,
  type FilterValues,
} from "../browse/filters";
import { ActiveFilterChips } from "../components/ActiveFilterChips";
import { AiSearchBox } from "../components/AiSearchBox";
import { Button } from "../components/Button";
import { FavoriteButton } from "../components/FavoriteButton";
import { EmptyState } from "../components/EmptyState";
import { FormAlert } from "../components/FormAlert";
import { SelectField } from "../components/SelectField";
import { TicketCard } from "../components/TicketCard";
import { ListingFilters } from "../components/ListingFilters";
import { Pagination } from "../components/Pagination";
import { TicketGridSkeleton } from "../components/Skeleton";
import { usePageTitle } from "../hooks/usePageTitle";

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
  usePageTitle("Browse rooms");
  const [params, setParams] = useSearchParams();
  // T-303: set when this page was opened by AI search; any change to the filters drops it.
  const aiSearch = useLocation().state as AiSearchState | null;
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

  // T-205: on small screens the panel folds behind a "Filters" button. "Show rooms" folds it again;
  // a stop or chip picked inside the panel leaves it open; invalid filters keep it open.
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  function apply(values: FilterValues, submitted = true): FilterErrors {
    const { errors } = toSearch(values);
    if (Object.keys(errors).length === 0) {
      setParams(filtersToParams(values));
      if (submitted) setFiltersOpen(false);
    }
    return errors;
  }

  function goToPage(page: number) {
    setParams(filtersToParams(parsed.values, page));
    document.querySelector(".browse-results")?.scrollIntoView?.();
  }

  const current = results?.key === queryKey ? results : null;
  const invalid = Object.keys(parsed.errors).length > 0;
  const panelOpen = invalid || filtersOpen;
  const { values } = parsed;
  const activeFilters =
    [
      values.neighborhood,
      values.minPrice,
      values.maxPrice,
      values.minArea,
    ].filter((v) => v.trim() !== "").length + values.amenities.length;

  // Sort and page live in the band and the pager, not the panel: changing them must not reset
  // what the visitor has typed in the panel but not applied yet.
  const panelParams = new URLSearchParams(queryKey);
  panelParams.delete("sort");
  panelParams.delete("page");
  const panelKey = panelParams.toString();

  const count =
    current?.kind === "ready" && current.page.totalItems > 0
      ? current.page.totalItems
      : null;

  return (
    <section className="browse">
      <div className="browse-band">
        <div className="wide browse-band-inner">
          <div>
            <h1 className="display">Browse rooms</h1>
            {count !== null && (
              <p className="results-count" role="status">
                {count === 1 ? "1 room found" : `${count} rooms found`}
              </p>
            )}
          </div>
          <div className="browse-sort">
            <SelectField
              label="Sort by"
              value={values.sort}
              onChange={(e) =>
                apply({ ...values, sort: e.target.value as ListingSort }, false)
              }
              options={SORT_OPTIONS}
            />
          </div>
        </div>
        <div className="wide browse-ai">
          <AiSearchBox placement="band" />
        </div>
      </div>
      <div className="wide browse-body">
        <Button
          variant="secondary"
          className="filter-toggle"
          aria-expanded={panelOpen}
          aria-controls="browse-filters"
          onClick={() => setFiltersOpen(!panelOpen)}
        >
          {panelOpen ? "Hide filters" : "Filters"}
          {activeFilters > 0 && ` (${activeFilters} active)`}
        </Button>
        <div
          id="browse-filters"
          className={panelOpen ? "filter-wrap open" : "filter-wrap"}
        >
          <ListingFilters
            // New filters in the URL (Back, a pasted link, or "Clear") reset the form to match.
            key={panelKey}
            initial={parsed.values}
            initialErrors={parsed.errors}
            neighborhoods={reference?.neighborhoods ?? []}
            amenities={reference?.amenities ?? parsed.values.amenities}
            // The panel does not show the sort; keep the one chosen in the band.
            onApply={(next, submitted) =>
              apply({ ...next, sort: values.sort }, submitted)
            }
          />
        </div>
        <div className="browse-results">
          {aiSearch?.aiQuery && (
            <div className="ai-result-note" role="status">
              <p>
                <span className="ai-spark" aria-hidden="true">
                  ✦
                </span>{" "}
                Rooms for “{aiSearch.aiQuery}”. Remove any filter that is not
                what you meant.
              </p>
              {aiSearch.aiNotes.length > 0 && (
                <ul>
                  {aiSearch.aiNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!invalid && (
            <ActiveFilterChips
              values={values}
              onChange={(next) => apply(next, false)}
            />
          )}
          {invalid ? (
            <FormAlert message="Some filters are not valid. Fix them and press Show rooms." />
          ) : !current ? (
            <TicketGridSkeleton count={6} />
          ) : current.kind === "error" ? (
            <FormAlert message={current.message} />
          ) : current.page.totalItems === 0 ? (
            activeFilters > 0 ? (
              <EmptyState title="No rooms match these filters">
                <p>
                  Try a wider price range, another neighborhood, or fewer
                  amenities.
                </p>
                <div className="empty-actions">
                  <Button onClick={() => apply(EMPTY_FILTERS)}>
                    Show all rooms
                  </Button>
                </div>
              </EmptyState>
            ) : (
              <EmptyState title="No rooms have been posted yet">
                <p>Check back soon.</p>
              </EmptyState>
            )
          ) : (
            <>
              {current.page.items.length === 0 ? (
                <p className="muted">This page is empty.</p>
              ) : (
                <ul className="ticket-grid">
                  {current.page.items.map((listing) => (
                    <li key={listing.id}>
                      <TicketCard
                        listing={listing}
                        headingLevel={2}
                        action={
                          <FavoriteButton
                            listingId={listing.id}
                            title={listing.title}
                            compact
                          />
                        }
                      />
                    </li>
                  ))}
                </ul>
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
