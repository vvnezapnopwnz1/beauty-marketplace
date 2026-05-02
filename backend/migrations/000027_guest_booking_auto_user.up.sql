-- Backfill: auto-create user accounts for existing guest appointments.
-- Future bookings will receive client_user_id at creation time (no guest fields set).
-- Existing rows are migrated in three steps: create missing users → link appointments → link salon_clients.

BEGIN;

-- Step 1: Create user accounts for guest phones that don't have one yet.
-- ON CONFLICT handles the race if the same phone booked twice with different names: first name wins.
-- Must match partial unique index users_phone_active_unique (000018): (phone_e164) WHERE deleted_at IS NULL.
INSERT INTO users (id, phone_e164, display_name, global_role, locale, theme_pref, created_at, updated_at)
SELECT
    gen_random_uuid(),
    sub.phone_e164,
    sub.guest_name,
    'client',
    'ru',
    'system',
    NOW(),
    NOW()
FROM (
    -- Deduplicate: one row per phone, pick the earliest guest_name
    SELECT DISTINCT ON (guest_phone_e164)
        guest_phone_e164 AS phone_e164,
        guest_name
    FROM appointments
    WHERE guest_phone_e164 IS NOT NULL
      AND client_user_id IS NULL
    ORDER BY guest_phone_e164, starts_at ASC
) sub
WHERE NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.phone_e164 = sub.phone_e164
      AND u.deleted_at IS NULL
)
ON CONFLICT (phone_e164) WHERE (deleted_at IS NULL) DO NOTHING;

-- Step 2: Link appointments.client_user_id to the user with matching phone.
-- After this UPDATE, guest_name and guest_phone_e164 become redundant but are kept for
-- historical reference; the CHECK constraint (000005) only requires one side to be non-null,
-- so having client_user_id set while guest fields remain is valid under the existing constraint:
--   (client_user_id IS NOT NULL AND guest_phone_e164 IS NULL)
-- We therefore NULL-out the guest fields to satisfy the constraint cleanly.
UPDATE appointments a
SET
    client_user_id   = u.id,
    guest_name       = NULL,
    guest_phone_e164 = NULL
FROM users u
WHERE a.guest_phone_e164 = u.phone_e164
  AND a.client_user_id IS NULL
  AND u.deleted_at IS NULL;

-- Step 3: Link salon_clients.user_id for CRM rows that were created from guest phones.
-- Skip rows that would violate uniq_salon_client_user (salon_id, user_id): same salon may already
-- have a registered-client row (000016) while a separate guest-by-phone row exists for the same user.
UPDATE salon_clients sc
SET user_id = u.id
FROM users u
WHERE sc.phone_e164 = u.phone_e164
  AND sc.user_id IS NULL
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM salon_clients other
    WHERE other.salon_id = sc.salon_id
      AND other.user_id = u.id
      AND other.id <> sc.id
  );

COMMIT;
