CREATE TABLE staff_phone_verifications (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id      UUID        NOT NULL REFERENCES salons(id),
    phone_e164    TEXT        NOT NULL,
    code          TEXT        NOT NULL,
    attempts      SMALLINT    NOT NULL DEFAULT 0,
    expires_at    TIMESTAMPTZ NOT NULL,
    verified_at   TIMESTAMPTZ,
    consumed_at   TIMESTAMPTZ,
    created_by    UUID        NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_phone_verif_lookup
    ON staff_phone_verifications (phone_e164, salon_id)
    WHERE verified_at IS NULL AND consumed_at IS NULL;

CREATE INDEX idx_staff_phone_verif_proof
    ON staff_phone_verifications (id)
    WHERE verified_at IS NOT NULL AND consumed_at IS NULL;
