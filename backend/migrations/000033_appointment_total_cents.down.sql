ALTER TABLE appointments 
  DROP COLUMN IF EXISTS total_cents,
  DROP COLUMN IF EXISTS total_source;
