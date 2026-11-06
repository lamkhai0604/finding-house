import { Link } from "react-router";
import type { Listing } from "../api/types";
import { formatAmenity, formatArea, formatPrice } from "../utils/format";
import { ListingImage } from "./ListingImage";

/** Rooms posted within this many days get a "New" badge. */
export const NEW_FOR_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isNew(listing: Listing, now = Date.now()): boolean {
  const posted = Date.parse(listing.createdAt);
  return Number.isFinite(posted) && now - posted < NEW_FOR_DAYS * DAY_MS;
}

interface TicketCardProps {
  listing: Listing;
  /** Heading level of the title inside the surrounding page. */
  headingLevel?: 2 | 3;
}

/**
 * D-033: a listing shaped like a transit ticket. Photo on top, a dashed tear line, then the
 * price, the title (the link to the listing), the neighborhood stop and up to two amenities.
 */
export function TicketCard({ listing, headingLevel = 3 }: TicketCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="ticket">
      <div className="ticket-photo">
        <ListingImage
          src={listing.imageUrls[0]}
          alt={listing.title}
          linkToFullSize={false}
        />
        {isNew(listing) && <span className="badge-new">New</span>}
      </div>
      <div className="ticket-stub">
        <p className="ticket-price">
          <span className="display">
            {formatPrice(listing.monthlyPriceCents)}
          </span>
          <span className="muted"> a month</span>
        </p>
        <Heading className="ticket-title">
          <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
        </Heading>
        <p className="ticket-stop">
          <span className="stop-dot" aria-hidden="true" />
          {listing.neighborhood}
          <span className="ticket-sep" aria-hidden="true">
            /
          </span>
          {formatArea(listing.areaSqft)}
        </p>
        {listing.amenities.length > 0 && (
          <ul className="tag-list" aria-label="Amenities">
            {listing.amenities.slice(0, 2).map((amenity) => (
              <li key={amenity} className="tag">
                {formatAmenity(amenity)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
