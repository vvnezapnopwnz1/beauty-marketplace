DROP TRIGGER IF EXISTS appointments_service_same_salon ON appointments;
DROP TRIGGER IF EXISTS appointments_staff_same_salon ON appointments;
DROP TRIGGER IF EXISTS appointments_set_updated_at ON appointments;

DROP FUNCTION IF EXISTS services_same_salon_as_appointment();
DROP FUNCTION IF EXISTS appointments_staff_same_salon();
DROP FUNCTION IF EXISTS appointments_set_updated_at();

DROP TABLE IF EXISTS user_telegram_identities;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS salon_subscriptions;
DROP TABLE IF EXISTS working_hours;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS salon_members;
DROP TABLE IF EXISTS salons;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS subscription_status;
DROP TYPE IF EXISTS subscription_plan;
DROP TYPE IF EXISTS salon_member_role;
DROP TYPE IF EXISTS appointment_status;
