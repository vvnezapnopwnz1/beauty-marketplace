DROP INDEX IF EXISTS idx_master_profiles_published;
ALTER TABLE master_profiles DROP COLUMN IF EXISTS published_at;
