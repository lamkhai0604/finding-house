import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { getNeighborhoodStats, searchListings } from "../api/listings";
import type { Listing, NeighborhoodStats } from "../api/types";
import { useSession } from "../auth/session";
import { Button } from "../components/Button";
import { ButtonLink } from "../components/ButtonLink";
import { NumberField } from "../components/NumberField";
import { SelectField } from "../components/SelectField";
import { TicketGridSkeleton } from "../components/Skeleton";
import { TicketCard } from "../components/TicketCard";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatPrice } from "../utils/format";
import { MONEY } from "../utils/numberInput";

/** How many of the newest listings the home page shows (T-210). */
export const NEWEST_COUNT = 4;

/** T-210: the Link light rail 1 Line, north to south, as neighborhoods the market knows. */
export const LINE_STOPS: { neighborhood: string; label: string }[] = [
  { neighborhood: "Northgate", label: "Northgate" },
  { neighborhood: "Roosevelt", label: "Roosevelt" },
  { neighborhood: "University District", label: "U District" },
  { neighborhood: "Capitol Hill", label: "Capitol Hill" },
  { neighborhood: "Downtown", label: "Downtown" },
  { neighborhood: "Beacon Hill", label: "Beacon Hill" },
  { neighborhood: "Columbia City", label: "Columbia City" },
];

type Load<T> = { kind: "loading" } | { kind: "ready"; data: T } | { kind: "error" };

/**
 * Loads once the session is known, so an expired stored token is not sent (see T-122). `load`
 * must be a module-level function so it keeps its identity between renders.
 */
function useHomeData<T>(load: () => Promise<T>, ready: boolean): Load<T> {
  const [state, setState] = useState<Load<T>>({ kind: "loading" });
  useEffect(() => {
    if (!ready) return;
    let active = true;
    load()
      .then((data): Load<T> => ({ kind: "ready", data }))
      .catch((): Load<T> => ({ kind: "error" }))
      .then((value) => {
        if (active) setState(value);
      });
    return () => {
      active = false;
    };
  }, [load, ready]);
  return state;
}

function loadNewest() {
  return searchListings({ sort: "newest", size: NEWEST_COUNT }).then(
    (page) => page.items,
  );
}

export function HomePage() {
  usePageTitle(null);
  const { status, user } = useSession();
  // Wait until a stored token has been checked: an expired token would otherwise turn these
  // public requests into 401s (the same reason the listing page waits).
  const sessionKnown = status !== "loading";
  const newest = useHomeData(loadNewest, sessionKnown);
  const stats = useHomeData(getNeighborhoodStats, sessionKnown);

  return (
    <div className="home">
      <Hero
        greeting={user ? `Welcome back, ${user.displayName}.` : null}
        neighborhoods={
          stats.kind === "ready"
            ? stats.data.map((s) => s.neighborhood)
            : LINE_STOPS.map((s) => s.neighborhood)
        }
        collage={newest.kind === "ready" ? newest.data.slice(0, 2) : []}
      />
      <LineStrip stats={stats} />
      <JustPosted newest={newest} />
      <HowItWorks />
    </div>
  );
}

function Hero({
  greeting,
  neighborhoods,
  collage,
}: {
  greeting: string | null;
  neighborhoods: string[];
  collage: Listing[];
}) {
  const navigate = useNavigate();
  const [neighborhood, setNeighborhood] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (neighborhood) params.set("neighborhood", neighborhood);
    if (maxPrice) params.set("maxPrice", maxPrice);
    const query = params.toString();
    // The browse page checks the values and explains any problem next to its filters.
    navigate(query ? `/browse?${query}` : "/browse");
  }

  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-inner">
        <div className="home-hero-text">
          <h1 id="home-title" className="display">
            Find a room near your stop
          </h1>
          <p className="home-hero-lead">
            Rooms and studios for rent across Seattle, posted by the landlords
            themselves. Pick a neighborhood on the line or search by rent.
          </p>
          {greeting && <p className="home-greeting">{greeting}</p>}
          <form
            className="home-search"
            aria-label="Search rooms"
            noValidate
            onSubmit={search}
          >
            <SelectField
              label="Neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              options={[
                { value: "", label: "Any neighborhood" },
                ...neighborhoods.map((n) => ({ value: n, label: n })),
              ]}
            />
            <NumberField
              label="Max rent per month"
              format={MONEY}
              prefix="$"
              placeholder="Any"
              value={maxPrice}
              onValueChange={setMaxPrice}
            />
            <Button type="submit" variant="primary">
              Search rooms
            </Button>
          </form>
        </div>
        <Collage listings={collage} />
      </div>
      <Skyline />
    </section>
  );
}

/** Decoration only: the two newest real rooms as tilted tickets, with the sun and the line. */
function Collage({ listings }: { listings: Listing[] }) {
  return (
    <div className="home-collage" aria-hidden="true">
      <div className="collage-sun" />
      <div className="collage-line" />
      {listings.map((listing, index) => (
        <div
          key={listing.id}
          className={`collage-ticket collage-ticket-${index + 1}`}
        >
          <div className="collage-photo">
            {listing.imageUrls[0] && (
              <img src={listing.imageUrls[0]} alt="" loading="lazy" />
            )}
            <span className="badge-new">New</span>
          </div>
          <div className="collage-stub">
            <p>
              <span className="display collage-price">
                {formatPrice(listing.monthlyPriceCents)}
              </span>
              <span className="muted"> a month</span>
            </p>
            <p className="ticket-stop">
              <span className="stop-dot" />
              {listing.neighborhood}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Seattle skyline with the Space Needle, drawn in the darker hero colour. */
function Skyline() {
  return (
    <svg
      className="home-skyline"
      aria-hidden="true"
      viewBox="0 0 1440 140"
      preserveAspectRatio="none"
    >
      <path d="M0 110 C 180 60, 360 70, 520 95 S 860 60, 1040 88 S 1320 70, 1440 92 L1440 140 L0 140 Z" />
      <rect x="860" y="70" width="34" height="70" />
      <rect x="900" y="52" width="26" height="88" />
      <rect x="932" y="78" width="40" height="62" />
      <rect x="978" y="40" width="22" height="100" />
      <rect x="1006" y="66" width="30" height="74" />
      <rect x="1042" y="58" width="24" height="82" />
      <rect x="783" y="22" width="6" height="118" />
      <path d="M768 24 L804 24 L798 14 L774 14 Z" />
      <rect x="784" y="4" width="4" height="10" />
    </svg>
  );
}

function stopSummary(stat: NeighborhoodStats | undefined): string[] {
  if (!stat || stat.activeListings === 0) return ["No rooms yet"];
  const rooms = `${stat.activeListings} ${stat.activeListings === 1 ? "room" : "rooms"}`;
  return stat.lowestMonthlyPriceCents === null
    ? [rooms]
    : [rooms, `from ${formatPrice(stat.lowestMonthlyPriceCents)}`];
}

function LineStrip({ stats }: { stats: Load<NeighborhoodStats[]> }) {
  const byName = new Map(
    stats.kind === "ready" ? stats.data.map((s) => [s.neighborhood, s]) : [],
  );
  return (
    <section className="home-line" aria-labelledby="line-title">
      <div className="home-wide">
        <div className="home-section-head">
          <h2 id="line-title" className="display">
            Rooms along the 1 Line
          </h2>
          <p className="muted">North to south. Tap a stop to see its rooms.</p>
        </div>
        <div className="line-track">
          <ol className="line-stops">
            {LINE_STOPS.map((stop) => (
              <li key={stop.neighborhood}>
                <Link
                  className="line-stop"
                  to={`/browse?${new URLSearchParams({ neighborhood: stop.neighborhood })}`}
                >
                  <span className="line-dot" aria-hidden="true" />
                  <strong>{stop.label}</strong>
                  {stats.kind === "ready" &&
                    stopSummary(byName.get(stop.neighborhood)).map((line) => (
                      <span key={line} className="line-meta">
                        {line}
                      </span>
                    ))}
                </Link>
              </li>
            ))}
          </ol>
        </div>
        {stats.kind === "error" && (
          <p className="muted" role="status">
            Room counts are not available right now; the stops still work.
          </p>
        )}
      </div>
    </section>
  );
}

function JustPosted({ newest }: { newest: Load<Listing[]> }) {
  return (
    <section className="home-wide home-block" aria-labelledby="newest-title">
      <div className="home-section-head">
        <h2 id="newest-title" className="display">
          Just posted
        </h2>
        <Link to="/browse" className="section-link">
          See all rooms
        </Link>
      </div>
      {newest.kind === "loading" && <TicketGridSkeleton count={NEWEST_COUNT} />}
      {newest.kind === "error" && (
        <p className="muted" role="status">
          Could not load the newest rooms right now. Please try again later.
        </p>
      )}
      {newest.kind === "ready" &&
        (newest.data.length === 0 ? (
          <p className="muted" role="status">
            No rooms have been posted yet.
          </p>
        ) : (
          <ul className="ticket-grid">
            {newest.data.map((listing) => (
              <li key={listing.id}>
                <TicketCard listing={listing} />
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="home-wide home-how" aria-label="How it works">
      <div>
        <h2 className="display">Looking for a room</h2>
        <ol>
          <li>Choose a neighborhood and the most you want to pay.</li>
          <li>Save the rooms you like; they wait for you under Saved rooms.</li>
          <li>
            Call the landlord straight from the listing. No middleman, no fees.
          </li>
        </ol>
      </div>
      <div>
        <h2 className="display">Renting one out</h2>
        <ol>
          <li>Sign up as a landlord and post your room with up to five photos.</li>
          <li>Hide it while you show it, unhide it if the deal falls through.</li>
          <li>Delete it once it is rented.</li>
        </ol>
        <ButtonLink to="/listings/new" variant="secondary">
          Post a room
        </ButtonLink>
      </div>
    </section>
  );
}
