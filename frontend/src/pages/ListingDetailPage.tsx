import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client";
import { getListing } from "../api/listings";
import type { ListingDetail } from "../api/types";
import { ImageGallery } from "../components/ImageGallery";
import { StatusMessage } from "../components/StatusMessage";
import { formatAmenity, formatArea, formatPrice } from "../utils/format";

type Result =
  | { kind: "loaded"; detail: ListingDetail }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

/** FR-04: public listing page. */
export function ListingDetailPage() {
  const { id = "" } = useParams();
  const [result, setResult] = useState<{ id: string; value: Result } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    getListing(id)
      .then((detail): Result => ({ kind: "loaded", detail }))
      .catch((e: unknown): Result => {
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
          return { kind: "not-found" };
        }
        return {
          kind: "error",
          message: e instanceof ApiError ? e.body.message : "Something went wrong.",
        };
      })
      .then((value) => {
        if (active) setResult({ id, value });
      });
    return () => {
      active = false;
    };
  }, [id]);

  // A result for a previous id means the new one is still loading.
  if (!result || result.id !== id) {
    return <StatusMessage title="Loading listing…" />;
  }
  const { value } = result;
  if (value.kind === "not-found") {
    return (
      <StatusMessage title="Listing not found">
        <p>It may have been removed or hidden by its owner.</p>
        <Link to="/">Back to home</Link>
      </StatusMessage>
    );
  }
  if (value.kind === "error") {
    return (
      <StatusMessage title="Could not load this listing">
        <p>{value.message}</p>
      </StatusMessage>
    );
  }

  const { listing, landlord } = value.detail;
  return (
    <article className="listing-detail">
      <ImageGallery urls={listing.imageUrls} title={listing.title} />
      <div className="listing-header">
        <h1>{listing.title}</h1>
        {listing.status === "HIDDEN" && (
          <span className="badge">Hidden — only you can see this</span>
        )}
        <p className="price">
          {formatPrice(listing.monthlyPriceCents)}
          <span className="muted"> / month</span>
        </p>
        <p className="muted">
          {listing.neighborhood}, {listing.city} · {formatArea(listing.areaSqft)}
        </p>
        <p>{listing.address}</p>
      </div>

      {listing.description && (
        <section>
          <h2>About this place</h2>
          <p className="description">{listing.description}</p>
        </section>
      )}

      <section>
        <h2>Amenities</h2>
        {listing.amenities.length > 0 ? (
          <ul className="amenities">
            {listing.amenities.map((amenity) => (
              <li key={amenity}>{formatAmenity(amenity)}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No amenities listed.</p>
        )}
      </section>

      <section className="contact">
        <h2>Contact</h2>
        <p>{landlord.displayName}</p>
        {landlord.phone ? (
          <p>
            <a href={`tel:${landlord.phone}`}>{landlord.phone}</a>
          </p>
        ) : (
          <p className="muted">No phone number provided.</p>
        )}
      </section>
    </article>
  );
}
