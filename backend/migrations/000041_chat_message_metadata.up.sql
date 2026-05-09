BEGIN;

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE chat_messages
    ALTER COLUMN type SET DEFAULT 'text';

UPDATE chat_messages
SET type = 'text'
WHERE type IS NULL;

ALTER TABLE chat_messages
    ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chat_messages_type_check'
          AND conrelid = 'chat_messages'::regclass
    ) THEN
        ALTER TABLE chat_messages
            ADD CONSTRAINT chat_messages_type_check
            CHECK (type IN ('text', 'attachment', 'system', 'appointment_request'));
    END IF;
END $$;

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

COMMIT;
