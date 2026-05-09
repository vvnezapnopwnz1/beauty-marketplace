BEGIN;

ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_master_profile_id_fkey;
DROP INDEX IF EXISTS chat_rooms_master_profile_idx;
ALTER TABLE chat_rooms DROP COLUMN IF EXISTS master_profile_id;

COMMIT;
