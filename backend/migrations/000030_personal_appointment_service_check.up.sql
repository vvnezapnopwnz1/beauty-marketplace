-- Personal (solo master) appointments store master_services.id in appointments.service_id.
-- The legacy trigger + FK only allowed salon services (services.salon_id = appointments.salon_id).

-- 1) Drop FK to services so master_service UUIDs are allowed on the column.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'appointments'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'service_id';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE appointments DROP CONSTRAINT %I', constraint_name);
    END IF;
END$$;

-- 2) Trigger: salon path unchanged; personal path validates master_services.
CREATE OR REPLACE FUNCTION services_same_salon_as_appointment()
RETURNS trigger AS $$
BEGIN
    IF NEW.salon_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM services srv
            WHERE srv.id = NEW.service_id AND srv.salon_id = NEW.salon_id
        ) THEN
            RAISE EXCEPTION 'service_id must belong to the same salon as appointment';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.master_profile_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM master_services ms
            WHERE ms.id = NEW.service_id AND ms.master_id = NEW.master_profile_id
        ) THEN
            RAISE EXCEPTION 'service_id must belong to the same master profile as appointment';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'appointment must have salon_id or master_profile_id for service_id validation';
END;
$$ LANGUAGE plpgsql;
