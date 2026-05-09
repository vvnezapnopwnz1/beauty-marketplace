BEGIN;

ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_type_check;

ALTER TABLE chat_messages
    DROP COLUMN IF EXISTS data;

ALTER TABLE chat_messages
    DROP COLUMN IF EXISTS type;

COMMIT;
