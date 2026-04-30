DROP INDEX IF EXISTS idx_telegram_outbox_pending;
DROP TABLE IF EXISTS telegram_outbox;

DROP TABLE IF EXISTS notification_preferences;

DROP INDEX IF EXISTS idx_notifications_guest_phone;
DROP INDEX IF EXISTS idx_notifications_user_history;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP TABLE IF EXISTS notifications;
