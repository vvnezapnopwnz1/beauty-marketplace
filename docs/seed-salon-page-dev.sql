-- =============================================================
-- DEV SEED: тестовые данные для разработки SalonPage
-- Использование: psql $DATABASE_URL -f seed-salon-page-dev.sql
-- Или через docker: docker exec -i <pg_container> psql -U postgres beautica < seed-salon-page-dev.sql
-- =============================================================
-- СЦЕНАРИИ:
--   salon-режим:  http://localhost:5173/salon/11111111-1111-1111-1111-111111111111
--   place-режим:  http://localhost:5173/place/141373143068689  (реальный 2GIS ID, Москва)
--   redirect:     http://localhost:5173/place/141373143068690  → должен редиректить на /salon/22222222-...
-- =============================================================

BEGIN;

-- ----------------------------------------------------------
-- Салон 1: полный профиль платформы (salon-режим)
-- UUID: 11111111-1111-1111-1111-111111111111
-- ----------------------------------------------------------
INSERT INTO salons (
    id, name_override, address_override, timezone, description,
    phone_public, online_booking_enabled, category_id, business_type,
    lat, lng, address, district, photo_url, badge, card_gradient, emoji,
    cached_rating, cached_review_count, created_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Студия красоты Lumière',
    'Москва, ул. Тверская, 18с1',
    'Europe/Moscow',
    'Современная студия красоты в центре Москвы. Работаем с 2015 года. Специализируемся на окрашивании, уходе за волосами и маникюре.',
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
    '✂️',
    4.8,
    47,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name_override = EXCLUDED.name_override,
    description = EXCLUDED.description,
    online_booking_enabled = EXCLUDED.online_booking_enabled,
    cached_rating = EXCLUDED.cached_rating;

-- Рабочие часы для салона 1 (0=пн, 6=вс)
DELETE FROM working_hours WHERE salon_id = '11111111-1111-1111-1111-111111111111';
INSERT INTO working_hours (salon_id, day_of_week, opens_at, closes_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 0, '09:00', '21:00'),  -- пн
    ('11111111-1111-1111-1111-111111111111', 1, '09:00', '21:00'),  -- вт
    ('11111111-1111-1111-1111-111111111111', 2, '09:00', '21:00'),  -- ср
    ('11111111-1111-1111-1111-111111111111', 3, '09:00', '21:00'),  -- чт
    ('11111111-1111-1111-1111-111111111111', 4, '09:00', '22:00'),  -- пт
    ('11111111-1111-1111-1111-111111111111', 5, '10:00', '22:00'),  -- сб
    ('11111111-1111-1111-1111-111111111111', 6, '10:00', '20:00');  -- вс

-- Услуги для салона 1
DELETE FROM services WHERE salon_id = '11111111-1111-1111-1111-111111111111';
INSERT INTO services (id, salon_id, name, duration_minutes, price_cents, is_active, sort_order, category, category_slug) VALUES
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Стрижка женская',         60,  250000, true, 1, 'Волосы',    'haircut_women'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Стрижка мужская',         45,  150000, true, 2, 'Волосы',    'haircut_men'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Окрашивание (однотонное)', 120, 550000, true, 3, 'Волосы',    'coloring'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Балаяж',                  180, 900000, true, 4, 'Волосы',    'balayage'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Маникюр классический',    60,  200000, true, 5, 'Маникюр',   'manicure_classic'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Маникюр с покрытием',     75,  280000, true, 6, 'Маникюр',   'manicure_gel'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Укладка',                 45,  180000, true, 7, 'Волосы',    'blowdry');

-- Мастер-профили
INSERT INTO master_profiles (id, phone_e164, bio, specializations, created_at) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+79001110001', 'Стилист с 8-летним опытом, специализируюсь на окрашивании и уходе за волосами.', ARRAY['Окрашивание', 'Стрижки', 'Уход'], NOW()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+79001110002', 'Мастер маникюра и педикюра. Работаю с гель-лаком, акрилом, наращиванием.',         ARRAY['Маникюр', 'Педикюр', 'Наращивание'], NOW())
ON CONFLICT (id) DO NOTHING;

-- Привязка мастеров к салону
INSERT INTO salon_masters (id, salon_id, master_id, display_name, color, status, is_active) VALUES
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Анна К.',   '#8B5CF6', 'active', true),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Марина С.', '#EC4899', 'active', true)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------
-- Салон 2: для теста redirect (place → salon)
-- UUID: 22222222-2222-2222-2222-222222222222
-- External ID: 141373143068690 (привязан через salon_external_ids)
-- Переход на: http://localhost:5173/place/141373143068690
--             → должен редиректить на /salon/22222222-...
-- ----------------------------------------------------------
INSERT INTO salons (
    id, name_override, address_override, timezone,
    online_booking_enabled, category_id, business_type,
    lat, lng, address, created_at
) VALUES (
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
) ON CONFLICT (id) DO UPDATE SET name_override = EXCLUDED.name_override;

-- Привязываем внешний ID — именно этот ID вставить в URL для теста redirect
INSERT INTO salon_external_ids (salon_id, source, external_id, synced_at) VALUES
    ('22222222-2222-2222-2222-222222222222', '2gis', '141373143068690', NOW())
ON CONFLICT (salon_id, source) DO UPDATE SET external_id = EXCLUDED.external_id;

COMMIT;

-- =============================================================
-- ИТОГО — что проверять:
--
-- 1. SALON-режим (полный профиль платформы):
--    http://localhost:5173/salon/11111111-1111-1111-1111-111111111111
--    Ожидание: вкладки Обзор/Услуги/Мастера, расписание из БД,
--              кнопка «Записаться», sidebar с записью
--
-- 2. PLACE-режим (только 2GIS, нет в нашей БД):
--    Взять любой externalId из поиска на главной, скопировать из URL
--    Например: http://localhost:5173/place/<externalId_из_поиска>
--    Ожидание: расписание из 2GIS, контакты из 2GIS,
--              sidebar с кнопкой «Позвонить», нет кнопки записи
--
-- 3. REDIRECT (place → salon):
--    http://localhost:5173/place/141373143068690
--    Ожидание: редирект на /salon/22222222-2222-2222-2222-222222222222
--              кнопка «назад» в браузере — возвращает туда откуда пришли
-- =============================================================
