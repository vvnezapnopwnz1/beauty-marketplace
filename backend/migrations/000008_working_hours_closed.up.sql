ALTER TABLE working_hours
    ADD COLUMN IF NOT EXISTS is_closed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN working_hours.is_closed IS 'When true, salon is closed that day (opens_at/closes_at ignored).';
