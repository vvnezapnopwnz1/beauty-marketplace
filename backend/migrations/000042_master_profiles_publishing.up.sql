ALTER TABLE master_profiles
    ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;

-- Backfill: only claimed (user_id IS NOT NULL) profiles are considered consenting.
-- Shadow profiles (user_id IS NULL) stay hidden on /master/:id; they continue to
-- appear on salon pages via salon_masters.
UPDATE master_profiles
   SET published_at = created_at
 WHERE user_id IS NOT NULL;

CREATE INDEX idx_master_profiles_published
    ON master_profiles(published_at)
    WHERE published_at IS NOT NULL;
