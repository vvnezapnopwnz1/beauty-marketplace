-- +migrate Up

CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected', 'duplicate');
CREATE TYPE claim_relation AS ENUM ('owner', 'manager', 'representative');

CREATE TABLE salon_claims (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_type    claim_relation NOT NULL DEFAULT 'owner',
    comment          TEXT,
    source           VARCHAR(50)   NOT NULL,
    external_id      VARCHAR(255)  NOT NULL,
    snapshot_name    TEXT          NOT NULL,
    snapshot_address TEXT,
    snapshot_phone   VARCHAR(50),
    snapshot_photo   TEXT,
    status           claim_status  NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by      UUID          REFERENCES users(id),
    reviewed_at      TIMESTAMPTZ,
    salon_id         UUID          REFERENCES salons(id),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_salon_claims_active
    ON salon_claims(user_id, source, external_id)
    WHERE status IN ('pending', 'approved');

CREATE INDEX idx_salon_claims_status
    ON salon_claims(status, created_at DESC);

ALTER TABLE salons
    ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
