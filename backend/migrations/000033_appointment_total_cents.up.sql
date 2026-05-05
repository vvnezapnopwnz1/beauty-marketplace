ALTER TABLE appointments
  ADD COLUMN total_cents       INT          NULL,
  ADD COLUMN total_source      VARCHAR(20)  NOT NULL DEFAULT 'calculated';

-- Backfill total_cents from existing line items
UPDATE appointments a
SET total_cents = sub.total
FROM (
  SELECT appointment_id, SUM(price_cents) AS total
  FROM appointment_line_items
  GROUP BY appointment_id
) sub
WHERE a.id = sub.appointment_id
  AND a.total_cents IS NULL;

-- Fallback for older appointments without line items (using primary service price)
UPDATE appointments a
SET total_cents = s.price_cents
FROM services s
WHERE a.service_id = s.id
  AND a.total_cents IS NULL;
