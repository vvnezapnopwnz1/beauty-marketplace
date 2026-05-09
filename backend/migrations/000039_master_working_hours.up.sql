CREATE TABLE IF NOT EXISTS master_working_hours (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
    day_of_week      SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at         VARCHAR(5) NOT NULL DEFAULT '09:00',
    closes_at        VARCHAR(5) NOT NULL DEFAULT '20:00',
    is_closed        BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(master_profile_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_mwh_master ON master_working_hours(master_profile_id);
