-- +migrate Down

ALTER TABLE salons DROP COLUMN IF EXISTS onboarding_completed;

DROP INDEX IF EXISTS idx_salon_claims_status;
DROP INDEX IF EXISTS ux_salon_claims_active;
DROP TABLE IF EXISTS salon_claims;
DROP TYPE IF EXISTS claim_relation;
DROP TYPE IF EXISTS claim_status;
