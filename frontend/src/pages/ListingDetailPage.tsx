import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ApiError } from "../api/client";
import { getListing } from "../api/listings";
import { useSession } from "../auth/session";
import type { ListingDetail } from "../api/types";
import { BackButton } from "../components/BackButton";
import { FavoriteButton } from "../components/FavoriteButton";
import { AmenityIcon } from "../components/AmenityIcon";
import { ButtonLink } from "../components/ButtonLink";
import { buttonClassName } from "../components/buttonStyles";
import { ImageGallery } from "../components/ImageGallery";
import { ReportListingDialog } from "../components/ReportListingDialog";
import { useToast } from "../toast/toast";
import { ListingDetailSkeleton } from "../components/Skeleton";
import { StatusMessage } from "../components/StatusMessage";
import { LINE_ORDER } from "../home/lineStops";
import {
  formatAmenity,
  formatArea,
  formatPrice,
  initials,
} from "../utils/format";
import { formatPostedAgo } from "../utils/postedAgo";
import { usePageTitle } from "../hooks/usePageTitle";

type Result =
  | { kind: "loaded"; detail: ListingDetail }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

/** FR-04: public listing page. */
export function ListingDetailPage() {
  const { id = "" } = useParams();
  const { status, user } = useSession();
  const location = useLocation();
  const toast = useToast();
  const [reporting, setReporting] = useState(false);
  // Who is looking matters: the owner may see a hidden listing (FR-04 AC2). Wait until the
  // session is restored, and load again when the viewer changes (login, logout).
  const viewer = status === "loading" ? null : String(user?.id ?? "anonymous");
  const key = `${id}|${viewer}`;
  const [result, setResult] = useState<{ key: string; value: Result } | null>(
    null,
  );
  const shown = result?.key === key ? result.value : null;
  usePageTitle(
    shown?.kind === "loaded"
      ? shown.detail.listing.title
      : shown?.kind === "not-found"
        ? "Listing not found"
        : null,
  );

  useEffect(() => {
    if (viewer === null) {
      return;
    }
    let active = true;
    getListing(id)
      .then((detail): Result => ({ kind: "loaded", detail }))
      .catch((e: unknown): Result => {
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
          return { kind: "not-found" };
        }
        return {
          kind: "error",
          message:
            e instanceof ApiError ? e.body.message : "Something went wrong.",
        };
      })
      .then((value) => {
        if (active) setResult({ key, value });
      });
    return () => {
      active = false;
    };
  }, [id, viewer, key]);

  // A result for a previous listing or viewer means the current one is still loading.
  if (!result || result.key !== key) {
    return <ListingDetailSkeleton />;
  }
  const { value } = result;
  if (value.kind === "not-found") {
    return (
      <StatusMessage title="Listing not found">
        <p>It may have been rented, removed or hidden by its owner.</p>
        <div className="empty-actions">
          <ButtonLink to="/browse" variant="primary">
            Browse rooms
          </ButtonLink>
        </div>
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
  const price = formatPrice(listing.monthlyPriceCents);
  return (
    <article className="listing-detail">
      <div className="page-toolbar">
        <BackButton fallback="/browse" label="Back to rooms" />
      </div>
      <ImageGallery urls={listing.imageUrls} title={listing.title} />

      <div className="detail-columns">
        <div className="detail-main">
          <p className="detail-place">
            <span className="stop-dot" aria-hidden="true" />
            {listing.neighborhood}, {listing.city}
          </p>
          <h1 className="display">{listing.title}</h1>
          {listing.status === "HIDDEN" && (
            <span className="badge">Hidden — only you can see this</span>
          )}
          {listing.status === "REMOVED" && (
            <p className="removed-note" role="note">
              <strong>Removed by a moderator.</strong> {listing.removedReason}
            </p>
          )}
          {user?.id === listing.landlordId && listing.status !== "REMOVED" && (
            <p>
              <ButtonLink to={`/listings/${listing.id}/edit`}>
                Edit this listing
              </ButtonLink>
            </p>
          )}

          <dl className="detail-facts">
            <div>
              <dt>Rent</dt>
              <dd className="display">{price}</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd className="display">{formatArea(listing.areaSqft)}</dd>
            </div>
            <div>
              <dt>Posted</dt>
              <dd className="display">{formatPostedAgo(listing.createdAt)}</dd>
            </div>
          </dl>

          {listing.description && (
            <section className="detail-section">
              <h2 className="display">About this place</h2>
              <p className="description">{listing.description}</p>
            </section>
          )}

          <section className="detail-section">
            <h2 className="display">What's included</h2>
            {listing.amenities.length > 0 ? (
              <ul className="amenity-list">
                {listing.amenities.map((amenity) => (
                  <li key={amenity}>
                    <AmenityIcon amenity={amenity} />
                    {formatAmenity(amenity)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No amenities listed.</p>
            )}
          </section>

          <GettingAround
            neighborhood={listing.neighborhood}
            address={listing.address}
          />
        </div>

        <aside className="contact-card" aria-label="Contact">
          <p className="contact-price">
            <span className="display">{price}</span>
            <span className="muted"> a month</span>
          </p>
          <div className="contact-person">
            <span className="avatar avatar-large" aria-hidden="true">
              {initials(landlord.displayName)}
            </span>
            <div>
              <p className="contact-name">{landlord.displayName}</p>
              <p className="muted">Landlord</p>
            </div>
          </div>
          {landlord.phone ? (
            <a
              className={buttonClassName("primary", "contact-call")}
              href={`tel:${landlord.phone}`}
            >
              <PhoneIcon />
              Call {landlord.phone}
            </a>
          ) : (
            <p className="muted contact-nophone">No phone number provided.</p>
          )}
          {listing.status === "ACTIVE" && (
            <div className="contact-save">
              <FavoriteButton listingId={listing.id} title={listing.title} />
            </div>
          )}
          <p className="contact-note">
            Finding House never asks for deposits or payments. Meet the landlord
            and see the room before paying anything.
          </p>
          {listing.status === "ACTIVE" &&
            user?.id !== listing.landlordId &&
            user?.role !== "ADMIN" &&
            (user ? (
              <button
                type="button"
                className="link-button report-link"
                onClick={() => setReporting(true)}
              >
                Report this listing
              </button>
            ) : (
              <Link
                className="report-link"
                to="/login"
                state={{ from: location.pathname }}
              >
                Log in to report this listing
              </Link>
            ))}
        </aside>
        <ReportListingDialog
          open={reporting}
          listingId={listing.id}
          title={listing.title}
          onCancel={() => setReporting(false)}
          onReported={() => {
            setReporting(false);
            toast.show("Thanks. A moderator will review this listing.");
          }}
        />
      </div>

      {/* T-216: on phones the contact card is far down; keep the price and Call in reach. */}
      <div className="contact-bar" role="region" aria-label="Quick contact">
        <p>
          <span className="display">{price}</span>
          <span className="muted"> a month</span>
        </p>
        {landlord.phone && (
          <a
            className={buttonClassName("primary")}
            href={`tel:${landlord.phone}`}
          >
            <PhoneIcon />
            Call
          </a>
        )}
      </div>
    </article>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

/**
 * T-212: where the room sits on the 1 Line. Only stations we know are shown; a neighborhood
 * without one says so instead of guessing a bus route.
 */
function GettingAround({
  neighborhood,
  address,
}: {
  neighborhood: string;
  address: string;
}) {
  const index = LINE_ORDER.findIndex((s) => s.neighborhood === neighborhood);
  const stops =
    index < 0
      ? []
      : LINE_ORDER.slice(Math.max(0, index - 1), index + 2).map((stop) => ({
          ...stop,
          here: stop.neighborhood === neighborhood,
        }));
  return (
    <section className="detail-section">
      <h2 className="display">Getting around</h2>
      <div className="getting-around">
        {stops.length > 0 && (
          <ol className="around-stops" aria-label="Nearby 1 Line stops">
            {stops.map((stop) => (
              <li
                key={stop.neighborhood}
                className={stop.here ? "here" : undefined}
                aria-current={stop.here ? "location" : undefined}
              >
                <span className="around-dot" aria-hidden="true" />
                {stop.here ? <strong>{stop.label}</strong> : stop.label}
              </li>
            ))}
          </ol>
        )}
        <p>
          {index < 0
            ? `${neighborhood} has no 1 Line station. Ask the landlord about the nearest bus or train.`
            : `${neighborhood} has its own 1 Line station.`}
        </p>
        <p className="around-address">
          <span className="muted">Address: </span>
          {address}
        </p>
      </div>
    </section>
  );
}
