BEGIN;

-- Remove attachment columns
ALTER TABLE chat_messages DROP COLUMN IF EXISTS attachment_url;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS attachment_type;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS attachment_filename;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS attachment_size_bytes;

-- Remove inquiry constraint
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_inquiry_has_salon;

COMMIT;
