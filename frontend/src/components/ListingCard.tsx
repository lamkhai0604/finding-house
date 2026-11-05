import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Listing } from "../api/types";
import { formatArea, formatPrice } from "../utils/format";
import { ListingImage } from "./ListingImage";

interface ListingCardProps {
  listing: Listing;
  /** Optional buttons or links, e.g. Edit / Hide on "My listings". */
  actions?: ReactNode;
}

/** Compact listing summary for lists ("My listings" now, browse results in Sprint 2). */
export function ListingCard({ listing, actions }: ListingCardProps) {
  return (
    <article className="listing-card">
      <ListingImage
        src={listing.imageUrls[0]}
        alt={listing.title}
        className="listing-card-image"
      />
      <div className="listing-card-body">
        <h2>
          <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
        </h2>
        <p className="listing-card-price">
          {formatPrice(listing.monthlyPriceCents)}
          <span className="muted"> / month</span>
        </p>
        <p className="muted">
          {listing.neighborhood} · {formatArea(listing.areaSqft)}
        </p>
        {listing.status === "HIDDEN" && <span className="badge">Hidden</span>}
        {actions && <div className="listing-card-actions">{actions}</div>}
      </div>
    </article>
  );
}
