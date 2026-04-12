-- Guest bookings: optional client_user_id, contact fields for walk-in requests

ALTER TABLE appointments
    ALTER COLUMN client_user_id DROP NOT NULL;

ALTER TABLE appointments
    ADD COLUMN guest_name text,
    ADD COLUMN guest_phone_e164 text;

ALTER TABLE appointments
    ADD CONSTRAINT appointments_client_or_guest CHECK (
        (client_user_id IS NOT NULL AND guest_phone_e164 IS NULL)
        OR
        (client_user_id IS NULL AND guest_phone_e164 IS NOT NULL AND guest_name IS NOT NULL AND length(trim(guest_name)) > 0)
    );

COMMENT ON COLUMN appointments.guest_name IS 'Set when booking without a registered user; client_user_id is NULL.';
COMMENT ON COLUMN appointments.guest_phone_e164 IS 'E.164 phone for guest booking; salon contacts the client.';
