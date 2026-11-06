import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Listing } from "../api/types";
import { formatAmenity, formatArea, formatPrice } from "../utils/format";
import { isNew } from "../utils/listingAge";
import { ListingImage } from "./ListingImage";

interface TicketCardProps {
  listing: Listing;
  /** Heading level of the title inside the surrounding page. */
  headingLevel?: 2 | 3;
  /** Shown over the photo's top-right corner, e.g. the save heart. */
  action?: ReactNode;
  /** Buttons under the stub, e.g. Edit / Hide / Delete on "My listings" (T-213). */
  footer?: ReactNode;
  /** T-213: a live preview of an unsaved listing; the title is not a link and blanks show "—". */
  preview?: boolean;
}

/**
 * D-033: a listing shaped like a transit ticket. Photo on top, a dashed tear line, then the
 * price, the title (the link to the listing), the neighborhood stop and up to two amenities.
 */
export function TicketCard({
  listing,
  headingLevel = 3,
  action,
  footer,
  preview = false,
}: TicketCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const price =
    preview && listing.monthlyPriceCents <= 0
      ? "$—"
      : formatPrice(listing.monthlyPriceCents);
  const area =
    preview && listing.areaSqft <= 0 ? "— sq ft" : formatArea(listing.areaSqft);
  return (
    <article
      className={
        listing.status === "HIDDEN" ? "ticket ticket-hidden" : "ticket"
      }
    >
      <div className="ticket-photo">
        <ListingImage
          src={listing.imageUrls[0]}
          alt={listing.title}
          linkToFullSize={false}
        />
        {listing.status === "HIDDEN" ? (
          <span className="badge-hidden">Hidden</span>
        ) : (
          isNew(listing) && <span className="badge-new">New</span>
        )}
        {action && <div className="ticket-action">{action}</div>}
      </div>
      <div className="ticket-stub">
        <p className="ticket-price">
          <span className="display">
            {price}
          </span>
          <span className="muted"> a month</span>
        </p>
        <Heading className="ticket-title">
          {preview ? (
            listing.title
          ) : (
            <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
          )}
        </Heading>
        <p className="ticket-stop">
          <span className="stop-dot" aria-hidden="true" />
          {listing.neighborhood}
          <span className="ticket-sep" aria-hidden="true">
            /
          </span>
          {area}
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
        {footer && <div className="ticket-footer">{footer}</div>}
      </div>
    </article>
  );
}
