-- Seed system tags (salon_id = NULL means visible to all salons).
INSERT INTO salon_client_tags (id, salon_id, name, color)
VALUES
    (gen_random_uuid(), NULL, 'VIP',                '#F59E0B'),
    (gen_random_uuid(), NULL, 'Постоянный',          '#10B981'),
    (gen_random_uuid(), NULL, 'Проблемный',          '#EF4444'),
    (gen_random_uuid(), NULL, 'Новый',               '#3B82F6'),
    (gen_random_uuid(), NULL, 'Требует внимания',    '#8B5CF6')
ON CONFLICT DO NOTHING;

-- Backfill salon_clients from registered-user appointments.
INSERT INTO salon_clients (id, salon_id, user_id, display_name, created_at, updated_at)
SELECT
    gen_random_uuid(),
    a.salon_id,
    a.client_user_id,
    COALESCE(u.display_name, 'Клиент'),
    MIN(a.created_at),
    MIN(a.created_at)
FROM appointments a
JOIN users u ON u.id = a.client_user_id
WHERE a.client_user_id IS NOT NULL
GROUP BY a.salon_id, a.client_user_id, u.display_name
ON CONFLICT DO NOTHING;

-- Backfill salon_clients from guest-phone appointments.
INSERT INTO salon_clients (id, salon_id, phone_e164, display_name, created_at, updated_at)
SELECT
    gen_random_uuid(),
    a.salon_id,
    a.guest_phone_e164,
    -- pick the guest_name from the most-recent appointment for this phone
    (
        SELECT a2.guest_name
        FROM appointments a2
        WHERE a2.salon_id = a.salon_id
          AND a2.guest_phone_e164 = a.guest_phone_e164
          AND a2.guest_name IS NOT NULL
        ORDER BY a2.created_at DESC
        LIMIT 1
    ),
    MIN(a.created_at),
    MIN(a.created_at)
FROM appointments a
WHERE a.guest_phone_e164 IS NOT NULL
  AND a.client_user_id IS NULL
GROUP BY a.salon_id, a.guest_phone_e164
ON CONFLICT DO NOTHING;

-- Link existing appointments to their salon_client rows (registered users).
UPDATE appointments ap
SET salon_client_id = sc.id
FROM salon_clients sc
WHERE sc.salon_id      = ap.salon_id
  AND sc.user_id       = ap.client_user_id
  AND ap.client_user_id IS NOT NULL
  AND ap.salon_client_id IS NULL;

-- Link existing appointments to their salon_client rows (guests).
UPDATE appointments ap
SET salon_client_id = sc.id
FROM salon_clients sc
WHERE sc.salon_id       = ap.salon_id
  AND sc.phone_e164     = ap.guest_phone_e164
  AND ap.guest_phone_e164 IS NOT NULL
  AND ap.client_user_id  IS NULL
  AND ap.salon_client_id IS NULL;
