-- 2.1 Create master_profiles
CREATE TABLE master_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    display_name        TEXT NOT NULL,
    avatar_url          TEXT,
    bio                 TEXT,
    specializations     TEXT[] NOT NULL DEFAULT '{}',
    years_experience    INT,
    phone_e164          TEXT,
    cached_rating       NUMERIC(3,2),
    cached_review_count INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_master_profiles_user_id UNIQUE (user_id),
    CONSTRAINT chk_master_profiles_rating CHECK (cached_rating IS NULL OR (cached_rating >= 1 AND cached_rating <= 5))
);

CREATE INDEX idx_master_profiles_user_id ON master_profiles(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_master_profiles_phone ON master_profiles(phone_e164) WHERE phone_e164 IS NOT NULL;

-- 2.2 Create master_services
CREATE TABLE master_services (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id           UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
    -- service_categories.slug has only a partial unique index (WHERE salon_id IS NULL),
    -- so PostgreSQL cannot enforce a FK to it.
    category_slug       TEXT,
    name                TEXT NOT NULL,
    description         TEXT,
    price_cents         INT,
    duration_minutes    INT NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_master_services_duration CHECK (duration_minutes > 0)
);

-- Validate category_slug against system categories (salon_id IS NULL).
CREATE OR REPLACE FUNCTION validate_master_services_category_slug()
RETURNS trigger AS $$
BEGIN
    IF NEW.category_slug IS NULL OR btrim(NEW.category_slug) = '' THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM service_categories sc
        WHERE sc.slug = NEW.category_slug
          AND sc.salon_id IS NULL
    ) THEN
        RAISE EXCEPTION 'master_services.category_slug "%" does not reference a system service category', NEW.category_slug;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_master_services_validate_category_slug
BEFORE INSERT OR UPDATE OF category_slug ON master_services
FOR EACH ROW
EXECUTE FUNCTION validate_master_services_category_slug();

CREATE INDEX idx_master_services_master_id ON master_services(master_id);

-- 2.3 Rename staff -> salon_masters
ALTER TABLE staff RENAME TO salon_masters;

-- 2.4 Add new columns to salon_masters
ALTER TABLE salon_masters
    ADD COLUMN master_id UUID REFERENCES master_profiles(id) ON DELETE SET NULL,
    ADD COLUMN display_name_override TEXT,
    ADD COLUMN left_at TIMESTAMP WITH TIME ZONE;

-- Add color only if not exists (it may have been added in 000009+)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'salon_masters' AND column_name = 'color'
    ) THEN
        ALTER TABLE salon_masters ADD COLUMN color TEXT;
    END IF;
END$$;

CREATE INDEX idx_salon_masters_master_id ON salon_masters(master_id) WHERE master_id IS NOT NULL;
CREATE INDEX idx_salon_masters_salon_id ON salon_masters(salon_id);

-- 2.5 Rename staff_services -> salon_master_services
ALTER TABLE staff_services RENAME TO salon_master_services;

ALTER TABLE salon_master_services
    ADD COLUMN IF NOT EXISTS price_override_cents INT,
    ADD COLUMN IF NOT EXISTS duration_override_minutes INT;

-- 2.6 Rename staff_working_hours -> salon_master_hours
ALTER TABLE staff_working_hours RENAME TO salon_master_hours;

-- 2.7 Rename staff_absences (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_absences') THEN
        ALTER TABLE staff_absences RENAME TO salon_master_absences;
    END IF;
END$$;

-- 2.8 Rename appointments.staff_id -> appointments.salon_master_id
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'appointments'
        AND kcu.column_name = 'staff_id'
        AND tc.constraint_type = 'FOREIGN KEY';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE appointments DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END$$;

ALTER TABLE appointments RENAME COLUMN staff_id TO salon_master_id;

ALTER TABLE appointments
    ADD CONSTRAINT appointments_salon_master_id_fkey
    FOREIGN KEY (salon_master_id) REFERENCES salon_masters(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION appointments_staff_same_salon()
RETURNS trigger AS $$
BEGIN
    IF NEW.salon_master_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM salon_masters sm
            WHERE sm.id = NEW.salon_master_id AND sm.salon_id = NEW.salon_id
        ) THEN
            RAISE EXCEPTION 'salon_master_id must belong to the same salon as appointment';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_staff_same_salon ON appointments;
CREATE TRIGGER appointments_staff_same_salon
    BEFORE INSERT OR UPDATE OF salon_id, salon_master_id ON appointments
    FOR EACH ROW
    EXECUTE PROCEDURE appointments_staff_same_salon();

DROP INDEX IF EXISTS idx_appointments_staff_id;
CREATE INDEX IF NOT EXISTS idx_appointments_salon_master_id ON appointments(salon_master_id) WHERE salon_master_id IS NOT NULL;

-- 2.9 Backfill: create master_profile for each existing master
CREATE TEMP TABLE _master_backfill AS
SELECT
    sm.id AS salon_master_id,
    gen_random_uuid() AS master_profile_id,
    sm.display_name,
    sm.created_at
FROM salon_masters sm
WHERE sm.master_id IS NULL;

INSERT INTO master_profiles (id, display_name, is_active, created_at, updated_at)
SELECT
    master_profile_id,
    display_name,
    TRUE,
    created_at,
    created_at
FROM _master_backfill;

UPDATE salon_masters sm
SET master_id = bf.master_profile_id
FROM _master_backfill bf
WHERE sm.id = bf.salon_master_id;

DROP TABLE _master_backfill;
