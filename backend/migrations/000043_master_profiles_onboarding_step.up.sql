DO $$ BEGIN
  CREATE TYPE master_onboarding_step AS ENUM (
    'profile', 'specializations', 'services', 'schedule', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE master_profiles
    ADD COLUMN onboarding_step master_onboarding_step;

UPDATE master_profiles mp
   SET onboarding_step = 'completed'
 WHERE mp.published_at IS NOT NULL
   AND mp.user_id IS NOT NULL;
