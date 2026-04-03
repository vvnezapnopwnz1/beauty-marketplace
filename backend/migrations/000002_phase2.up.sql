-- Phase 2: verified reviews, waitlist, payment metadata extension

CREATE TABLE reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid NOT NULL REFERENCES appointments (id) ON DELETE CASCADE,
    rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
    body text,
    response_text text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reviews_appointment_id_key UNIQUE (appointment_id)
);

CREATE INDEX idx_reviews_created_at ON reviews (created_at);

CREATE TABLE waitlist_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    salon_id uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    service_id uuid REFERENCES services (id) ON DELETE SET NULL,
    desired_from date,
    desired_to date,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_salon_status ON waitlist_entries (salon_id, status);
CREATE INDEX idx_waitlist_user_created ON waitlist_entries (user_id, created_at);

ALTER TABLE salon_subscriptions
    ADD COLUMN payment_provider text;

COMMENT ON TABLE reviews IS 'Verified reviews only: application should allow insert when appointment.status = completed.';
COMMENT ON COLUMN waitlist_entries.status IS 'Application-defined, e.g. active, cancelled, fulfilled.';
COMMENT ON COLUMN salon_subscriptions.payment_provider IS 'e.g. yookassa, sbp — for reconciliation with external_payment_ref.';
