BEGIN;

DROP TABLE IF EXISTS master_clients;

ALTER TABLE appointments DROP COLUMN master_profile_id;

-- Make appointments.salon_id NOT NULL again. 
-- WARNING: This will fail if there are personal appointments (where salon_id IS NULL).
-- We do a naive fallback or just DELETE them for the down migration if we want it to succeed.
-- For safety, we delete appointments where salon_id is NULL before adding the constraint.
DELETE FROM appointments WHERE salon_id IS NULL;
ALTER TABLE appointments ALTER COLUMN salon_id SET NOT NULL;

ALTER TABLE salon_masters DROP COLUMN specializations;

COMMIT;
