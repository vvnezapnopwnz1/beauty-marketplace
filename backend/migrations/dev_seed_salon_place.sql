-- DEV SEED: тестовые данные для SalonPage dual-mode.
-- Usage:
--   psql "postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable" -f backend/migrations/dev_seed_salon_place.sql
--
-- Scenarios:
--   /salon/11111111-1111-1111-1111-111111111111
--   /place/141373143068689               (place-only, if returned by 2GIS)
--   /place/141373143068690               (redirect -> /salon/22222222-2222-2222-2222-222222222222)

BEGIN;

-- 1) Full platform salon profile.
INSERT INTO salons (
  id, name_override, address_override, timezone, description,
  phone_public, online_booking_enabled, category_id, business_type,
  lat, lng, address, district, photo_url, badge, card_gradient, emoji,
  cached_rating, cached_review_count, created_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Студия красоты Lumiere',
  'Москва, ул. Тверская, 18с1',
  'Europe/Moscow',
  'Современная студия красоты в центре Москвы. Специализация: окрашивание, уход и nail-сервис.',
  '+7 495 123-45-67',
  true,
  'hair',
  'venue',
  55.7638, 37.6068,
  'Тверская ул., 18с1',
  'Тверской',
  NULL,
  'top',
  'bg2',
  '✂',
  4.8,
  47,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name_override = EXCLUDED.name_override,
  address_override = EXCLUDED.address_override,
  timezone = EXCLUDED.timezone,
  description = EXCLUDED.description,
  phone_public = EXCLUDED.phone_public,
  online_booking_enabled = EXCLUDED.online_booking_enabled,
  category_id = EXCLUDED.category_id,
  business_type = EXCLUDED.business_type,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  address = EXCLUDED.address,
  district = EXCLUDED.district,
  photo_url = EXCLUDED.photo_url,
  badge = EXCLUDED.badge,
  card_gradient = EXCLUDED.card_gradient,
  emoji = EXCLUDED.emoji,
  cached_rating = EXCLUDED.cached_rating,
  cached_review_count = EXCLUDED.cached_review_count;

DELETE FROM working_hours WHERE salon_id = '11111111-1111-1111-1111-111111111111';
INSERT INTO working_hours (id, salon_id, day_of_week, opens_at, closes_at, is_closed, break_starts_at, break_ends_at)
VALUES
  ('11111111-aaaa-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 0, '09:00', '21:00', false, '13:00', '14:00'),
  ('11111111-aaaa-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 1, '09:00', '21:00', false, '13:00', '14:00'),
  ('11111111-aaaa-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 2, '09:00', '21:00', false, '13:00', '14:00'),
  ('11111111-aaaa-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 3, '09:00', '21:00', false, '13:00', '14:00'),
  ('11111111-aaaa-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 4, '09:00', '22:00', false, '13:00', '14:00'),
  ('11111111-aaaa-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', 5, '10:00', '22:00', false, NULL, NULL),
  ('11111111-aaaa-4000-8000-000000000007', '11111111-1111-1111-1111-111111111111', 6, '10:00', '20:00', false, NULL, NULL);

DELETE FROM services WHERE salon_id = '11111111-1111-1111-1111-111111111111';
INSERT INTO services (id, salon_id, name, duration_minutes, price_cents, is_active, sort_order, category, category_slug)
VALUES
  ('11111111-bbbb-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Стрижка женская', 60, 250000, true, 1, 'Волосы', 'hair_cuts'),
  ('11111111-bbbb-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Стрижка мужская', 45, 150000, true, 2, 'Волосы', 'hair_cuts'),
  ('11111111-bbbb-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Окрашивание', 120, 550000, true, 3, 'Волосы', 'hair_coloring'),
  ('11111111-bbbb-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'Балаяж', 180, 900000, true, 4, 'Волосы', 'hair_highlights'),
  ('11111111-bbbb-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'Маникюр с покрытием', 75, 280000, true, 5, 'Маникюр', 'nails_gel_polish');

INSERT INTO master_profiles (id, display_name, phone_e164, bio, specializations, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Анна К.', '+79001110001', 'Стилист с опытом 8 лет.', ARRAY['Окрашивание', 'Стрижки'], NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Марина С.', '+79001110002', 'Мастер маникюра и педикюра.', ARRAY['Маникюр', 'Педикюр'], NOW())
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  phone_e164 = EXCLUDED.phone_e164,
  bio = EXCLUDED.bio,
  specializations = EXCLUDED.specializations;

INSERT INTO salon_masters (id, salon_id, master_id, display_name, color, status, is_active)
VALUES
  ('11111111-cccc-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Анна К.', '#8B5CF6', 'active', true),
  ('11111111-cccc-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Марина С.', '#EC4899', 'active', true)
ON CONFLICT DO NOTHING;

-- 2) Redirect target salon for /place/:externalId -> /salon/:id
INSERT INTO salons (
  id, name_override, address_override, timezone,
  online_booking_enabled, category_id, business_type,
  lat, lng, address, created_at
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Барбершоп Brothers',
  'Москва, ул. Арбат, 35',
  'Europe/Moscow',
  false,
  'barber',
  'venue',
  55.7494, 37.5912,
  'ул. Арбат, 35',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name_override = EXCLUDED.name_override,
  address_override = EXCLUDED.address_override;

INSERT INTO salon_external_ids (salon_id, source, external_id, synced_at)
VALUES ('22222222-2222-2222-2222-222222222222', '2gis', '141373143068690', NOW())
ON CONFLICT (source, external_id) DO UPDATE
SET salon_id = EXCLUDED.salon_id, synced_at = EXCLUDED.synced_at;

COMMIT;
