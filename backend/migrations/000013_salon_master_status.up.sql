-- Lifecycle for salon membership: active roster, pending invite, inactive (left / deactivated).
CREATE TYPE salon_master_status AS ENUM ('active', 'pending', 'inactive');

ALTER TABLE salon_masters
    ADD COLUMN status salon_master_status NOT NULL DEFAULT 'active';

-- Existing inactive masters become status inactive; active rows stay active.
UPDATE salon_masters SET status = 'inactive' WHERE is_active = false;
