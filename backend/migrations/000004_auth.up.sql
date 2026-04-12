-- Auth system: global roles, OTP codes, refresh tokens

CREATE TYPE global_role AS ENUM (
    'client',
    'salon_owner',
    'master',
    'advertiser',
    'admin'
);

ALTER TABLE users
    ADD COLUMN global_role global_role NOT NULL DEFAULT 'client';

CREATE TABLE otp_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164 text NOT NULL,
    code text NOT NULL,
    attempts smallint NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    used boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_phone_expires ON otp_codes (phone_e164, expires_at);

CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE UNIQUE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash) WHERE NOT revoked;

COMMENT ON TYPE global_role IS 'Platform-wide role. salon_members provides per-salon context roles (owner/admin).';
COMMENT ON TABLE otp_codes IS 'Short-lived OTP codes for phone auth. Clean up expired rows periodically.';
COMMENT ON COLUMN otp_codes.attempts IS 'Failed verify attempts; lock after 5.';
