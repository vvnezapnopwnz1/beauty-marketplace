-- Beauty marketplace — initial schema (MVP core)
--
-- Frozen conventions:
--   day_of_week: 0 = Monday .. 6 = Sunday (aligned with ISO-8601 weekday in application code).
--   appointments.staff_id: NULLABLE for MVP (salon-wide booking when UI has a single implicit resource);
--     when set, must reference staff.salon_id = appointments.salon_id (enforced below).
--
-- Overlapping bookings: PostgreSQL partial EXCLUDE constraints are not available for "active only"
-- statuses without triggers. Use a transaction with REPEATABLE READ / SERIALIZABLE or
-- SELECT ... FOR UPDATE on the relevant staff row (or salon row when staff_id IS NULL) before
-- INSERT, plus an overlap check query for active statuses:
--   status NOT IN ('cancelled_by_client', 'cancelled_by_salon')

CREATE TYPE appointment_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled_by_client',
    'cancelled_by_salon',
    'completed',
    'no_show'
);

CREATE TYPE salon_member_role AS ENUM (
    'owner',
    'admin'
);

CREATE TYPE subscription_plan AS ENUM (
    'free',
    'paid'
);

CREATE TYPE subscription_status AS ENUM (
    'active',
    'expired',
    'trial'
);

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164 text NOT NULL,
    display_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_phone_e164_key UNIQUE (phone_e164)
);

CREATE TABLE salons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    external_source text NOT NULL,
    external_id text NOT NULL,
    name_override text,
    address_override text,
    timezone text NOT NULL DEFAULT 'Europe/Moscow',
    description text,
    phone_public text,
    online_booking_enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT salons_external_key UNIQUE (external_source, external_id)
);

CREATE TABLE salon_members (
    salon_id uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role salon_member_role NOT NULL,
    PRIMARY KEY (salon_id, user_id)
);

CREATE TABLE staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    display_name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_salon_id ON staff (salon_id);

CREATE TABLE services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    name text NOT NULL,
    duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
    price_cents bigint,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_services_salon_id ON services (salon_id);

CREATE TABLE working_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    opens_at time NOT NULL,
    closes_at time NOT NULL,
    valid_from date,
    valid_to date,
    CONSTRAINT working_hours_opens_before_closes CHECK (opens_at < closes_at),
    CONSTRAINT working_hours_salon_day_unique UNIQUE (salon_id, day_of_week)
);

CREATE INDEX idx_working_hours_salon_id ON working_hours (salon_id);

CREATE TABLE salon_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL,
    status subscription_status NOT NULL,
    current_period_end timestamptz,
    external_payment_ref text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_salon_subscriptions_salon_id ON salon_subscriptions (salon_id);

CREATE TABLE appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    client_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    staff_id uuid REFERENCES staff (id) ON DELETE RESTRICT,
    service_id uuid NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    status appointment_status NOT NULL DEFAULT 'pending',
    client_note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT appointments_time_order CHECK (starts_at < ends_at)
);

CREATE INDEX idx_appointments_salon_starts ON appointments (salon_id, starts_at);
CREATE INDEX idx_appointments_client_starts ON appointments (client_user_id, starts_at);
CREATE INDEX idx_appointments_staff_starts ON appointments (staff_id, starts_at)
    WHERE staff_id IS NOT NULL;

CREATE TABLE user_telegram_identities (
    user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    telegram_user_id bigint NOT NULL,
    telegram_chat_id bigint,
    linked_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_telegram_identities_telegram_user_id_key UNIQUE (telegram_user_id)
);

CREATE OR REPLACE FUNCTION appointments_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_set_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE PROCEDURE appointments_set_updated_at();

CREATE OR REPLACE FUNCTION appointments_staff_same_salon()
RETURNS trigger AS $$
BEGIN
    IF NEW.staff_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = NEW.staff_id AND s.salon_id = NEW.salon_id
        ) THEN
            RAISE EXCEPTION 'staff_id must belong to the same salon as appointment';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_staff_same_salon
    BEFORE INSERT OR UPDATE OF salon_id, staff_id ON appointments
    FOR EACH ROW
    EXECUTE PROCEDURE appointments_staff_same_salon();

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

CREATE TRIGGER appointments_service_same_salon
    BEFORE INSERT OR UPDATE OF salon_id, service_id ON appointments
    FOR EACH ROW
    EXECUTE PROCEDURE services_same_salon_as_appointment();

COMMENT ON TYPE appointment_status IS 'Lifecycle of a booking; overlap checks must ignore cancelled_by_client and cancelled_by_salon.';
COMMENT ON COLUMN working_hours.day_of_week IS '0 = Monday .. 6 = Sunday.';
COMMENT ON COLUMN appointments.staff_id IS 'NULLABLE for MVP salon-wide slot; set when booking a specific staff member.';
