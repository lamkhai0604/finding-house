-- T-601 (FR-08, D-036 to D-038): administrators, removed listings, reports, moderation record.

-- D-036: an administrator role, never available at sign-up (checked in AuthService).
ALTER TABLE users DROP CONSTRAINT ck_users_role;
ALTER TABLE users ADD CONSTRAINT ck_users_role CHECK (role IN ('TENANT', 'LANDLORD', 'ADMIN'));

-- D-037: moderators remove, never delete; the reason is shown to the owner.
ALTER TABLE listings DROP CONSTRAINT ck_listings_status;
ALTER TABLE listings ADD CONSTRAINT ck_listings_status CHECK (status IN ('ACTIVE', 'HIDDEN', 'REMOVED'));
ALTER TABLE listings ADD COLUMN removed_reason VARCHAR(200);
ALTER TABLE listings ADD CONSTRAINT ck_listings_removed_reason
    CHECK ((status = 'REMOVED') = (removed_reason IS NOT NULL));

-- D-038: reports from signed-in users. Deleting a listing deletes its reports.
CREATE TABLE listing_reports (
    id          BIGSERIAL    PRIMARY KEY,
    listing_id  BIGINT       NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
    reporter_id BIGINT       NOT NULL REFERENCES users (id),
    reason      VARCHAR(20)  NOT NULL,
    note        VARCHAR(500),
    status      VARCHAR(10)  NOT NULL DEFAULT 'OPEN',
    created_at  TIMESTAMPTZ  NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by BIGINT       REFERENCES users (id),
    CONSTRAINT ck_listing_reports_reason CHECK (reason IN ('SCAM', 'WRONG_INFO', 'UNAVAILABLE', 'OFFENSIVE', 'OTHER')),
    CONSTRAINT ck_listing_reports_status CHECK (status IN ('OPEN', 'DISMISSED', 'ACTIONED')),
    CONSTRAINT ck_listing_reports_resolved CHECK ((status = 'OPEN') = (resolved_at IS NULL))
);

-- One open report per user per listing; the queue reads open reports; the daily limit counts by reporter.
CREATE UNIQUE INDEX uk_listing_reports_open ON listing_reports (listing_id, reporter_id) WHERE status = 'OPEN';
CREATE INDEX ix_listing_reports_open_listing ON listing_reports (listing_id) WHERE status = 'OPEN';
CREATE INDEX ix_listing_reports_reporter_created ON listing_reports (reporter_id, created_at);

-- FR-08 AC4: an append-only record. No foreign key to listings, so it outlives a deleted listing;
-- the title is copied for the same reason.
CREATE TABLE moderation_actions (
    id            BIGSERIAL    PRIMARY KEY,
    listing_id    BIGINT       NOT NULL,
    listing_title VARCHAR(100) NOT NULL,
    admin_id      BIGINT       NOT NULL REFERENCES users (id),
    action        VARCHAR(10)  NOT NULL,
    reason        VARCHAR(200),
    created_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ck_moderation_actions_action CHECK (action IN ('REMOVE', 'RESTORE', 'DISMISS'))
);

CREATE INDEX ix_moderation_actions_listing ON moderation_actions (listing_id, created_at);

-- The database itself refuses to change or erase the record, whatever the application does.
CREATE FUNCTION moderation_actions_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'moderation_actions is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_moderation_actions_append_only
    BEFORE UPDATE OR DELETE ON moderation_actions
    FOR EACH ROW EXECUTE FUNCTION moderation_actions_append_only();
