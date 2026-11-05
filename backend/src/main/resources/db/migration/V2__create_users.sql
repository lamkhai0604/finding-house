-- T-101 (FR-01): user accounts.
-- Emails are stored trimmed and lower-cased by the application, so the
-- unique constraint also makes registration case-insensitive.
CREATE TABLE users (
    id            BIGSERIAL    PRIMARY KEY,
    email         VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(50)  NOT NULL,
    role          VARCHAR(16)  NOT NULL,
    phone         VARCHAR(30),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('TENANT', 'LANDLORD')),
    CONSTRAINT ck_users_phone_landlord_only CHECK (phone IS NULL OR role = 'LANDLORD')
);
