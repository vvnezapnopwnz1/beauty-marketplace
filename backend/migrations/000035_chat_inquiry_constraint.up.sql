BEGIN;

-- Add constraint for inquiry rooms: must have salon_id
ALTER TABLE chat_rooms ADD CONSTRAINT chat_rooms_inquiry_has_salon CHECK (
    type <> 'inquiry' OR salon_id IS NOT NULL
);

-- Add attachment columns for Phase 2A photo support
ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT NULL;
ALTER TABLE chat_messages ADD COLUMN attachment_type TEXT NULL CHECK (attachment_type IN ('image'));
ALTER TABLE chat_messages ADD COLUMN attachment_filename TEXT NULL;
ALTER TABLE chat_messages ADD COLUMN attachment_size_bytes INTEGER NULL;

COMMIT;
