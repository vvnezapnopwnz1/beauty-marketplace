BEGIN;

ALTER TABLE service_categories
    ADD COLUMN IF NOT EXISTS name_en text,
    ADD COLUMN IF NOT EXISTS parent_name_ru text,
    ADD COLUMN IF NOT EXISTS parent_name_en text,
    ADD COLUMN IF NOT EXISTS specialist_title_ru text,
    ADD COLUMN IF NOT EXISTS specialist_title_en text;

UPDATE service_categories
SET parent_name_ru = CASE parent_slug
        WHEN 'hair' THEN 'Волосы'
        WHEN 'barbershop' THEN 'Барбершоп'
        WHEN 'nails' THEN 'Маникюр и педикюр'
        WHEN 'brows' THEN 'Брови'
        WHEN 'lashes' THEN 'Ресницы'
        WHEN 'permanent' THEN 'Перманентный макияж'
        WHEN 'makeup' THEN 'Макияж'
        WHEN 'skin' THEN 'Уход за лицом'
        WHEN 'massage' THEN 'Массаж'
        WHEN 'spa' THEN 'SPA и уход за телом'
        WHEN 'depilation' THEN 'Депиляция'
        WHEN 'tanning' THEN 'Солярий'
        WHEN 'teeth' THEN 'Отбеливание зубов'
        WHEN 'packages' THEN 'Комплексы и пакеты'
        ELSE parent_slug
    END,
    specialist_title_ru = CASE parent_slug
        WHEN 'hair' THEN 'Парикмахер'
        WHEN 'barbershop' THEN 'Барбер'
        WHEN 'nails' THEN 'Мастер маникюра'
        WHEN 'brows' THEN 'Бровист'
        WHEN 'lashes' THEN 'Лэшмейкер'
        WHEN 'permanent' THEN 'Мастер перманентного макияжа'
        WHEN 'makeup' THEN 'Визажист'
        WHEN 'skin' THEN 'Косметолог'
        WHEN 'massage' THEN 'Массажист'
        WHEN 'spa' THEN 'SPA-специалист'
        WHEN 'depilation' THEN 'Мастер депиляции'
        WHEN 'tanning' THEN 'Специалист по загару'
        WHEN 'teeth' THEN 'Специалист по отбеливанию зубов'
        WHEN 'packages' THEN 'Beauty-специалист'
        ELSE parent_slug
    END
WHERE parent_name_ru IS NULL
   OR specialist_title_ru IS NULL;

ALTER TABLE service_categories
    ALTER COLUMN parent_name_ru SET NOT NULL,
    ALTER COLUMN specialist_title_ru SET NOT NULL;

UPDATE master_profiles
SET specializations = COALESCE((
    SELECT array_agg(DISTINCT mapped.slug ORDER BY mapped.slug)
    FROM unnest(specializations) AS raw(value)
    CROSS JOIN LATERAL (
        SELECT CASE lower(trim(raw.value))
            WHEN 'colorist' THEN 'hair'
            WHEN 'stylist' THEN 'hair'
            WHEN 'haircut' THEN 'hair'
            WHEN 'окрашивание' THEN 'hair'
            WHEN 'стрижки' THEN 'hair'
            WHEN 'nail_master' THEN 'nails'
            WHEN 'маникюр' THEN 'nails'
            WHEN 'педикюр' THEN 'nails'
            WHEN 'browist' THEN 'brows'
            WHEN 'barber' THEN 'barbershop'
            WHEN 'massage' THEN 'massage'
            WHEN 'массаж' THEN 'massage'
            ELSE trim(raw.value)
        END AS slug
    ) mapped
    WHERE mapped.slug IN (
        'hair', 'barbershop', 'nails', 'brows', 'lashes', 'permanent', 'makeup',
        'skin', 'massage', 'spa', 'depilation', 'tanning', 'teeth', 'packages'
    )
), '{}')
WHERE specializations IS NOT NULL;

UPDATE salon_masters
SET specializations = COALESCE((
    SELECT array_agg(DISTINCT mapped.slug ORDER BY mapped.slug)
    FROM unnest(specializations) AS raw(value)
    CROSS JOIN LATERAL (
        SELECT CASE lower(trim(raw.value))
            WHEN 'colorist' THEN 'hair'
            WHEN 'stylist' THEN 'hair'
            WHEN 'haircut' THEN 'hair'
            WHEN 'окрашивание' THEN 'hair'
            WHEN 'стрижки' THEN 'hair'
            WHEN 'nail_master' THEN 'nails'
            WHEN 'маникюр' THEN 'nails'
            WHEN 'педикюр' THEN 'nails'
            WHEN 'browist' THEN 'brows'
            WHEN 'barber' THEN 'barbershop'
            WHEN 'massage' THEN 'massage'
            WHEN 'массаж' THEN 'massage'
            ELSE trim(raw.value)
        END AS slug
    ) mapped
    WHERE mapped.slug IN (
        'hair', 'barbershop', 'nails', 'brows', 'lashes', 'permanent', 'makeup',
        'skin', 'massage', 'spa', 'depilation', 'tanning', 'teeth', 'packages'
    )
), '{}')
WHERE specializations IS NOT NULL;

COMMIT;
