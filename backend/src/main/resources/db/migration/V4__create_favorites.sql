-- T-403 (FR-06): listings a tenant has saved. One row per (tenant, listing), so saving twice
-- changes nothing (AC1). Rows go away with the user or the listing.
CREATE TABLE favorites (
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    listing_id BIGINT      NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, listing_id)
);

-- Deleting a listing removes its favorites; this index keeps that delete fast.
CREATE INDEX ix_favorites_listing_id ON favorites (listing_id);
