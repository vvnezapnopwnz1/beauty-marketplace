-- +migrate Up

ALTER TABLE users
  ADD COLUMN username     varchar(32),
  ADD COLUMN first_name   varchar(64),
  ADD COLUMN last_name    varchar(64),
  ADD COLUMN birth_date   date,
  ADD COLUMN gender       varchar(16),
  ADD COLUMN city         varchar(64),
  ADD COLUMN bio          text,
  ADD COLUMN locale       varchar(8)  NOT NULL DEFAULT 'ru',
  ADD COLUMN theme_pref   varchar(8)  NOT NULL DEFAULT 'system',
  ADD COLUMN avatar_url   text,
  ADD COLUMN updated_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN deleted_at   timestamptz;

CREATE UNIQUE INDEX users_username_ci_unique
  ON users (LOWER(username))
  WHERE username IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE users ADD CONSTRAINT users_username_format
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,32}$');
ALTER TABLE users ADD CONSTRAINT users_gender_check
  CHECK (gender IS NULL OR gender IN ('male','female','other','prefer_not_to_say'));
ALTER TABLE users ADD CONSTRAINT users_theme_pref_check
  CHECK (theme_pref IN ('light','dark','system'));
ALTER TABLE users ADD CONSTRAINT users_locale_check
  CHECK (locale IN ('ru','en'));

-- заменяем простой UNIQUE на частичный (soft-delete-safe)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_e164_key;
DROP INDEX IF EXISTS idx_users_phone_e164; -- if index was explicitly created instead of constraint
CREATE UNIQUE INDEX users_phone_active_unique
  ON users (phone_e164)
  WHERE deleted_at IS NULL;

-- auto-touch updated_at
CREATE OR REPLACE FUNCTION trg_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER users_touch_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();
