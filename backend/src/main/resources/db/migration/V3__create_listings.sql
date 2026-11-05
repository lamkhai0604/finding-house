-- T-103 (FR-02): listings, their amenities, and image links (D-017).
CREATE TABLE listings (
    id                  BIGSERIAL     PRIMARY KEY,
    landlord_id         BIGINT        NOT NULL REFERENCES users (id),
    title               VARCHAR(100)  NOT NULL,
    description         VARCHAR(2000) NOT NULL DEFAULT '',
    monthly_price_cents BIGINT        NOT NULL,
    area_sqft           INTEGER       NOT NULL,
    city                VARCHAR(50)   NOT NULL,
    neighborhood        VARCHAR(50)   NOT NULL,
    address             VARCHAR(200)  NOT NULL,
    status              VARCHAR(10)   NOT NULL,
    created_at          TIMESTAMPTZ   NOT NULL,
    updated_at          TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_listings_price_positive CHECK (monthly_price_cents > 0),
    CONSTRAINT ck_listings_area_positive CHECK (area_sqft > 0),
    CONSTRAINT ck_listings_status CHECK (status IN ('ACTIVE', 'HIDDEN'))
);

-- "My listings" (FR-02 AC6). Browse/filter indexes come with T-201, after measuring (CODE-15).
CREATE INDEX ix_listings_landlord_id ON listings (landlord_id);

CREATE TABLE listing_amenities (
    listing_id BIGINT      NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
    amenity    VARCHAR(32) NOT NULL,
    PRIMARY KEY (listing_id, amenity),
    CONSTRAINT ck_listing_amenities_amenity CHECK (amenity IN (
        'AIR_CONDITIONING', 'PRIVATE_BATHROOM', 'WASHING_MACHINE', 'KITCHEN',
        'PARKING', 'WIFI', 'FURNISHED', 'PETS_ALLOWED'))
);

-- Image links only; the server never downloads them (D-017). Order is kept by position.
CREATE TABLE listing_images (
    listing_id BIGINT        NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
    position   INTEGER       NOT NULL,
    url        VARCHAR(2048) NOT NULL,
    PRIMARY KEY (listing_id, position),
    CONSTRAINT ck_listing_images_position CHECK (position >= 0 AND position < 5)
);
