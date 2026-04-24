CREATE TABLE IF NOT EXISTS telegram_phone_links (
    phone_e164  TEXT PRIMARY KEY,
    chat_id     BIGINT NOT NULL,
    telegram_id BIGINT,
    first_name  TEXT,
    linked_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_phone_links_chat_id
    ON telegram_phone_links(chat_id);
