BEGIN;

ALTER TABLE chat_rooms
    ADD COLUMN IF NOT EXISTS master_profile_id UUID NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chat_rooms_master_profile_id_fkey'
          AND conrelid = 'chat_rooms'::regclass
    ) THEN
        ALTER TABLE chat_rooms
            ADD CONSTRAINT chat_rooms_master_profile_id_fkey
            FOREIGN KEY (master_profile_id) REFERENCES master_profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS chat_rooms_master_profile_idx ON chat_rooms(master_profile_id)
    WHERE master_profile_id IS NOT NULL;

COMMIT;
