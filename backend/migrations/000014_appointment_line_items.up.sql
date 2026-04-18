-- Snapshots for multi-service guest bookings (and single-service rows for consistency).

CREATE TABLE appointment_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL,
    service_name TEXT NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    price_cents BIGINT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_line_items_appointment_id ON appointment_line_items(appointment_id);

COMMENT ON TABLE appointment_line_items IS 'Per-service snapshot (name, duration, price) at booking time; appointments.service_id remains the primary service for legacy views.';
