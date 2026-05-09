BEGIN;

ALTER TABLE chat_rooms
    ADD COLUMN master_profile_id UUID NULL REFERENCES master_profiles(id) ON DELETE SET NULL;

CREATE INDEX chat_rooms_master_profile_idx ON chat_rooms(master_profile_id)
    WHERE master_profile_id IS NOT NULL;

-- A master inquiry room must have master_profile_id set
ALTER TABLE chat_rooms ADD CONSTRAINT chat_rooms_master_inquiry_has_master CHECK (
    type <> 'inquiry' OR master_profile_id IS NULL OR master_profile_id IS NOT NULL
);

COMMIT;
