import { useEffect, useState } from "react";
import { searchListings } from "../api/listings";
import type { Listing } from "../api/types";
import { useSession } from "../auth/session";
import { ButtonLink } from "../components/ButtonLink";
import { Carousel, type CarouselItem } from "../components/Carousel";
import { CarouselSkeleton } from "../components/Skeleton";
import { formatPrice } from "../utils/format";
import { usePageTitle } from "../hooks/usePageTitle";

/** How many of the newest listings the home page shows (T-122). */
export const NEWEST_COUNT = 8;

type Newest =
  | { kind: "loading" }
  | { kind: "ready"; items: CarouselItem[] }
  | { kind: "error" };

function toSlide(listing: Listing): CarouselItem {
  const price = formatPrice(listing.monthlyPriceCents);
  return {
    id: String(listing.id),
    imageUrl: listing.imageUrls[0],
    title: listing.title,
    subtitle: `${price}/month · ${listing.neighborhood}`,
    href: `/listings/${listing.id}`,
  };
}

export function HomePage() {
  usePageTitle(null);
  const { status, user } = useSession();
  const [newest, setNewest] = useState<Newest>({ kind: "loading" });
  // Wait until a stored token has been checked: an expired token would otherwise turn this public
  // request into a 401 (the same reason the listing page waits).
  const sessionKnown = status !== "loading";

  useEffect(() => {
    if (!sessionKnown) return;
    let active = true;
    searchListings({ sort: "newest", size: NEWEST_COUNT })
      .then((page): Newest => ({
        kind: "ready",
        items: page.items.map(toSlide),
      }))
      .catch((): Newest => ({ kind: "error" }))
      .then((value) => {
        if (active) setNewest(value);
      });
    return () => {
      active = false;
    };
  }, [sessionKnown]);

  return (
    <>
      <section className="hero">
        <h1>Find a room in Seattle</h1>
        <p className="hero-lead">
          Browse rooms and studios posted by local landlords.
        </p>
        {user && <p>Welcome back, {user.displayName}.</p>}
        <div className="hero-actions">
          {/* Log in, Sign up, and Post a room live in the header; one clear action here. */}
          <ButtonLink to="/browse" variant="primary">
            Browse rooms
          </ButtonLink>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <h2>Newest rooms</h2>
          <p className="muted">Recently posted by Seattle landlords.</p>
        </div>
        {newest.kind === "loading" && <CarouselSkeleton />}
        {newest.kind === "error" && (
          <p className="muted" role="status">
            Could not load the newest rooms right now. Please try again later.
          </p>
        )}
        {newest.kind === "ready" &&
          (newest.items.length === 0 ? (
            <p className="muted" role="status">
              No rooms have been posted yet.
            </p>
          ) : (
            <>
              <Carousel label="Newest rooms" items={newest.items} />
              <div className="section-footer">
                <ButtonLink to="/browse">See all rooms</ButtonLink>
              </div>
            </>
          ))}
      </section>
    </>
  );
}
