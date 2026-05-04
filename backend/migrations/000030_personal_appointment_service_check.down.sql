-- Restore legacy trigger (personal rows with master service ids may fail this check).
CREATE OR REPLACE FUNCTION services_same_salon_as_appointment()
RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM services srv
        WHERE srv.id = NEW.service_id AND srv.salon_id = NEW.salon_id
    ) THEN
        RAISE EXCEPTION 'service_id must belong to the same salon as appointment';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-add FK to services (fails if orphan service_id values exist).
ALTER TABLE appointments
    ADD CONSTRAINT appointments_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT;
