-- Dashboard: staff profile fields, service categories, staff_services, slot duration, breaks, overrides, absences

ALTER TABLE salons
    ADD COLUMN IF NOT EXISTS slot_duration_minutes integer NOT NULL DEFAULT 30
        CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 240);

COMMENT ON COLUMN salons.slot_duration_minutes IS 'Booking slot step in minutes for capacity calculations (15/30/60).';

ALTER TABLE staff
    ADD COLUMN IF NOT EXISTS role text,
    ADD COLUMN IF NOT EXISTS level text,
    ADD COLUMN IF NOT EXISTS bio text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS telegram_username text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS color text,
    ADD COLUMN IF NOT EXISTS joined_at date,
    ADD COLUMN IF NOT EXISTS dashboard_access boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS telegram_notifications boolean NOT NULL DEFAULT true;

ALTER TABLE services
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN services.category IS 'Service category (hair, nails, etc.) for dashboard filtering.';

CREATE TABLE IF NOT EXISTS staff_services (
    staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_services_service_id ON staff_services (service_id);

ALTER TABLE working_hours
    ADD COLUMN IF NOT EXISTS break_starts_at time,
    ADD COLUMN IF NOT EXISTS break_ends_at time;

COMMENT ON COLUMN working_hours.break_starts_at IS 'Optional lunch break start; NULL if no break.';
COMMENT ON COLUMN working_hours.break_ends_at IS 'Optional lunch break end; both must be set or both NULL.';

ALTER TABLE staff_working_hours
    ADD COLUMN IF NOT EXISTS break_starts_at time,
    ADD COLUMN IF NOT EXISTS break_ends_at time;

CREATE TABLE IF NOT EXISTS salon_date_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    on_date date NOT NULL,
    is_closed boolean NOT NULL DEFAULT true,
    note text,
    CONSTRAINT salon_date_overrides_unique UNIQUE (salon_id, on_date)
);

CREATE INDEX IF NOT EXISTS idx_salon_date_overrides_salon ON salon_date_overrides (salon_id);

CREATE TABLE IF NOT EXISTS staff_absences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    kind text NOT NULL DEFAULT 'vacation',
    CONSTRAINT staff_absences_range CHECK (starts_on <= ends_on)
);

CREATE INDEX IF NOT EXISTS idx_staff_absences_staff ON staff_absences (staff_id);
