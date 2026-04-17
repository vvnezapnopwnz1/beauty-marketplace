-- 1. Clear master_id to avoid FK violations
UPDATE salon_masters SET master_id = NULL;

-- 2. Rename appointments column back
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_salon_master_id_fkey;
ALTER TABLE appointments RENAME COLUMN salon_master_id TO staff_id;
ALTER TABLE appointments
    ADD CONSTRAINT appointments_staff_id_fkey
    FOREIGN KEY (staff_id) REFERENCES salon_masters(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION appointments_staff_same_salon()
RETURNS trigger AS $$
BEGIN
    IF NEW.staff_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM salon_masters sm
            WHERE sm.id = NEW.staff_id AND sm.salon_id = NEW.salon_id
        ) THEN
            RAISE EXCEPTION 'staff_id must belong to the same salon as appointment';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_staff_same_salon ON appointments;
CREATE TRIGGER appointments_staff_same_salon
    BEFORE INSERT OR UPDATE OF salon_id, staff_id ON appointments
    FOR EACH ROW
    EXECUTE PROCEDURE appointments_staff_same_salon();

DROP INDEX IF EXISTS idx_appointments_salon_master_id;
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id) WHERE staff_id IS NOT NULL;

-- 3. Rename salon_master_absences back
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salon_master_absences') THEN
        ALTER TABLE salon_master_absences RENAME TO staff_absences;
    END IF;
END$$;

-- 4. Rename salon_master_hours back
ALTER TABLE salon_master_hours RENAME TO staff_working_hours;

-- 5. Remove override columns and rename salon_master_services back
ALTER TABLE salon_master_services
    DROP COLUMN IF EXISTS price_override_cents,
    DROP COLUMN IF EXISTS duration_override_minutes;
ALTER TABLE salon_master_services RENAME TO staff_services;

-- 6. Remove new columns from salon_masters and rename back
DROP INDEX IF EXISTS idx_salon_masters_master_id;
DROP INDEX IF EXISTS idx_salon_masters_salon_id;
ALTER TABLE salon_masters
    DROP COLUMN IF EXISTS master_id,
    DROP COLUMN IF EXISTS display_name_override,
    DROP COLUMN IF EXISTS left_at;
ALTER TABLE salon_masters RENAME TO staff;

-- 7. Drop new tables
DROP TRIGGER IF EXISTS trg_master_services_validate_category_slug ON master_services;
DROP FUNCTION IF EXISTS validate_master_services_category_slug();
DROP TABLE IF EXISTS master_services;
DROP TABLE IF EXISTS master_profiles;
