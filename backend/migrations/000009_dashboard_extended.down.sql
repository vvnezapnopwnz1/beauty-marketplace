DROP TABLE IF EXISTS staff_absences;
DROP TABLE IF EXISTS salon_date_overrides;
DROP TABLE IF EXISTS staff_services;

ALTER TABLE staff_working_hours
    DROP COLUMN IF EXISTS break_starts_at,
    DROP COLUMN IF EXISTS break_ends_at;

ALTER TABLE working_hours
    DROP COLUMN IF EXISTS break_starts_at,
    DROP COLUMN IF EXISTS break_ends_at;

ALTER TABLE services
    DROP COLUMN IF EXISTS category,
    DROP COLUMN IF EXISTS description;

ALTER TABLE staff
    DROP COLUMN IF EXISTS role,
    DROP COLUMN IF EXISTS level,
    DROP COLUMN IF EXISTS bio,
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS telegram_username,
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS color,
    DROP COLUMN IF EXISTS joined_at,
    DROP COLUMN IF EXISTS dashboard_access,
    DROP COLUMN IF EXISTS telegram_notifications;

ALTER TABLE salons
    DROP COLUMN IF EXISTS slot_duration_minutes;
