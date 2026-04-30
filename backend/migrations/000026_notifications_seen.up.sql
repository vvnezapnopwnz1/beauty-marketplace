ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unseen
    ON notifications(user_id, created_at DESC)
    WHERE user_id IS NOT NULL AND seen_at IS NULL;
