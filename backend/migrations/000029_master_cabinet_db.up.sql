BEGIN;

-- 1. Add specializations to salon_masters
ALTER TABLE salon_masters ADD COLUMN specializations text[] NOT NULL DEFAULT '{}';

-- 2. Backfill specializations from master_profiles
UPDATE salon_masters sm
SET specializations = mp.specializations
FROM master_profiles mp
WHERE sm.master_id = mp.id
  AND mp.specializations IS NOT NULL
  AND array_length(mp.specializations, 1) > 0;

-- 3. Make appointments.salon_id nullable and add master_profile_id
ALTER TABLE appointments ALTER COLUMN salon_id DROP NOT NULL;
ALTER TABLE appointments ADD COLUMN master_profile_id uuid REFERENCES master_profiles(id) ON DELETE SET NULL;

-- 4. Create master_clients table
CREATE TABLE master_clients (
    id uuid PRIMARY KEY,
    master_profile_id uuid NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    phone_e164 text,
    extra_contact text,
    display_name text NOT NULL,
    notes text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_master_clients_master_profile_id ON master_clients(master_profile_id);
CREATE INDEX idx_master_clients_deleted_at ON master_clients(deleted_at);

COMMIT;
