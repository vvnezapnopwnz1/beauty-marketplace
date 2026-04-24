-- +migrate Down

DROP TRIGGER IF EXISTS users_touch_updated_at ON users;
DROP FUNCTION IF EXISTS trg_touch_updated_at();

DROP INDEX IF EXISTS users_phone_active_unique;
-- recreate original unique constraint/index
ALTER TABLE users ADD CONSTRAINT users_phone_e164_key UNIQUE (phone_e164);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_locale_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_theme_pref_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gender_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_format;

DROP INDEX IF EXISTS users_username_ci_unique;

ALTER TABLE users
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS theme_pref,
  DROP COLUMN IF EXISTS locale,
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS username;
