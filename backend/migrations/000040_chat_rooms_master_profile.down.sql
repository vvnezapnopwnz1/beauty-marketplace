BEGIN;

ALTER TABLE chat_rooms DROP COLUMN master_profile_id;

COMMIT;
