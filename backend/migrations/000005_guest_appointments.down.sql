ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_client_or_guest;
ALTER TABLE appointments DROP COLUMN IF EXISTS guest_name;
ALTER TABLE appointments DROP COLUMN IF EXISTS guest_phone_e164;

DELETE FROM appointments WHERE client_user_id IS NULL;
ALTER TABLE appointments ALTER COLUMN client_user_id SET NOT NULL;
