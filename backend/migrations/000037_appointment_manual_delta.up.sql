ALTER TABLE appointments
  ADD COLUMN manual_delta_cents INT NULL;

WITH line_totals AS (
  SELECT appointment_id, SUM(price_cents)::INT AS base_total
  FROM appointment_line_items
  GROUP BY appointment_id
)
UPDATE appointments a
SET manual_delta_cents = CASE
  WHEN a.total_source = 'manual' AND a.total_cents IS NOT NULL
    THEN a.total_cents - COALESCE(line_totals.base_total, 0)
  ELSE 0
END
FROM line_totals
WHERE a.id = line_totals.appointment_id;

UPDATE appointments
SET manual_delta_cents = CASE
  WHEN total_source = 'manual' AND total_cents IS NOT NULL THEN total_cents
  ELSE 0
END
WHERE manual_delta_cents IS NULL;
