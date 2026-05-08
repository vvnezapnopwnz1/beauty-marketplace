CREATE OR REPLACE FUNCTION appointments_guard_final_status_field_updates()
RETURNS trigger AS $$
BEGIN
    IF OLD.status IN ('completed', 'cancelled_by_salon', 'cancelled_by_client', 'no_show') THEN
        IF (
            ROW(
                NEW.salon_id,
                NEW.master_profile_id,
                NEW.client_user_id,
                NEW.guest_name,
                NEW.guest_phone_e164,
                NEW.salon_master_id,
                NEW.service_id,
                NEW.starts_at,
                NEW.ends_at,
                NEW.client_note,
                NEW.salon_client_id,
                NEW.total_cents,
                NEW.total_source,
                NEW.manual_delta_cents
            ) IS DISTINCT FROM ROW(
                OLD.salon_id,
                OLD.master_profile_id,
                OLD.client_user_id,
                OLD.guest_name,
                OLD.guest_phone_e164,
                OLD.salon_master_id,
                OLD.service_id,
                OLD.starts_at,
                OLD.ends_at,
                OLD.client_note,
                OLD.salon_client_id,
                OLD.total_cents,
                OLD.total_source,
                OLD.manual_delta_cents
            )
        ) OR NEW.status = OLD.status THEN
            RAISE EXCEPTION 'appointment fields are immutable in final status';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_guard_final_status_field_updates ON appointments;
CREATE TRIGGER appointments_guard_final_status_field_updates
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE PROCEDURE appointments_guard_final_status_field_updates();
