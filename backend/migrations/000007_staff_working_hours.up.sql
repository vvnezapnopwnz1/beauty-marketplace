-- Per-staff weekly schedule (salon working_hours remain salon-wide defaults).
CREATE TABLE staff_working_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
    day_of_week smallint NOT NULL,
    opens_at time NOT NULL,
    closes_at time NOT NULL,
    is_day_off boolean NOT NULL DEFAULT false,
    CONSTRAINT staff_working_hours_dow CHECK (day_of_week >= 0 AND day_of_week <= 6),
    CONSTRAINT staff_working_hours_day_unique UNIQUE (staff_id, day_of_week),
    CONSTRAINT staff_working_hours_time_ok CHECK (is_day_off OR (opens_at < closes_at))
);

CREATE INDEX idx_staff_working_hours_staff_id ON staff_working_hours (staff_id);

COMMENT ON TABLE staff_working_hours IS 'Per-master weekly hours; 0=Monday .. 6=Sunday.';
