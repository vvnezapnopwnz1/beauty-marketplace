-- Idempotent re-seed of system service_categories (same rows as 000010).
-- Run after db-reset when the table was emptied or when e2e needs the catalog without full migrate.

INSERT INTO service_categories (
  salon_id, slug, name_ru, parent_slug, parent_name_ru, specialist_title_ru, sort_order, is_system
)
SELECT
  v.salon_id,
  v.slug,
  v.name_ru,
  v.parent_slug,
  CASE v.parent_slug
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
    ELSE v.parent_slug
  END,
  CASE v.parent_slug
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
    ELSE v.parent_slug
  END,
  v.sort_order,
  v.is_system
FROM (VALUES
(NULL::uuid, 'hair_cuts', 'Стрижки', 'hair', 10, true),
(NULL::uuid, 'hair_coloring', 'Окрашивание', 'hair', 20, true),
(NULL::uuid, 'hair_highlights', 'Мелирование и балаяж', 'hair', 30, true),
(NULL::uuid, 'hair_styling', 'Укладки и причёски', 'hair', 40, true),
(NULL::uuid, 'hair_perm', 'Химическая завивка', 'hair', 50, true),
(NULL::uuid, 'hair_straightening', 'Выпрямление и кератин', 'hair', 60, true),
(NULL::uuid, 'hair_treatment', 'Уход и восстановление', 'hair', 70, true),
(NULL::uuid, 'hair_extensions', 'Наращивание волос', 'hair', 80, true),
(NULL::uuid, 'hair_coloring_mens', 'Окрашивание мужское', 'hair', 90, true),
(NULL::uuid, 'barber_haircuts', 'Стрижки', 'barbershop', 10, true),
(NULL::uuid, 'barber_beard', 'Борода и усы', 'barbershop', 20, true),
(NULL::uuid, 'barber_shaving', 'Бритьё', 'barbershop', 30, true),
(NULL::uuid, 'barber_coloring', 'Окрашивание', 'barbershop', 40, true),
(NULL::uuid, 'barber_styling', 'Укладка и оформление', 'barbershop', 50, true),
(NULL::uuid, 'barber_care', 'Уход за кожей лица', 'barbershop', 60, true),
(NULL::uuid, 'nails_manicure', 'Маникюр', 'nails', 10, true),
(NULL::uuid, 'nails_gel_polish', 'Покрытие гель-лак', 'nails', 20, true),
(NULL::uuid, 'nails_extensions', 'Наращивание ногтей', 'nails', 30, true),
(NULL::uuid, 'nails_design', 'Дизайн и декор', 'nails', 40, true),
(NULL::uuid, 'nails_pedicure', 'Педикюр', 'nails', 50, true),
(NULL::uuid, 'nails_pedicure_coating', 'Педикюр с покрытием', 'nails', 60, true),
(NULL::uuid, 'nails_medical_pedicure', 'Медицинский педикюр', 'nails', 70, true),
(NULL::uuid, 'nails_spa', 'СПА-уход для рук и ног', 'nails', 80, true),
(NULL::uuid, 'brows_correction', 'Коррекция бровей', 'brows', 10, true),
(NULL::uuid, 'brows_coloring', 'Окрашивание бровей', 'brows', 20, true),
(NULL::uuid, 'brows_lamination', 'Ламинирование бровей', 'brows', 30, true),
(NULL::uuid, 'brows_styling', 'Укладка бровей', 'brows', 40, true),
(NULL::uuid, 'brows_permanent', 'Перманентный макияж бровей', 'brows', 50, true),
(NULL::uuid, 'lashes_extensions', 'Наращивание ресниц', 'lashes', 10, true),
(NULL::uuid, 'lashes_lamination', 'Ламинирование ресниц', 'lashes', 20, true),
(NULL::uuid, 'lashes_perm', 'Биозавивка ресниц', 'lashes', 30, true),
(NULL::uuid, 'lashes_coloring', 'Окрашивание ресниц', 'lashes', 40, true),
(NULL::uuid, 'lashes_removal', 'Снятие наращивания', 'lashes', 50, true),
(NULL::uuid, 'permanent_brows', 'Перманентный макияж бровей', 'permanent', 10, true),
(NULL::uuid, 'permanent_lips', 'Перманентный макияж губ', 'permanent', 20, true),
(NULL::uuid, 'permanent_eyeliner', 'Татуаж век и стрелки', 'permanent', 30, true),
(NULL::uuid, 'permanent_correction', 'Коррекция перманентного макияжа', 'permanent', 40, true),
(NULL::uuid, 'permanent_removal', 'Удаление перманентного макияжа', 'permanent', 50, true),
(NULL::uuid, 'makeup_day_evening', 'Дневной и вечерний макияж', 'makeup', 10, true),
(NULL::uuid, 'makeup_wedding', 'Свадебный макияж', 'makeup', 20, true),
(NULL::uuid, 'makeup_photo', 'Макияж для фотосессии', 'makeup', 30, true),
(NULL::uuid, 'makeup_lessons', 'Уроки макияжа', 'makeup', 40, true),
(NULL::uuid, 'skin_cleansing', 'Чистка лица', 'skin', 10, true),
(NULL::uuid, 'skin_peeling', 'Пилинги', 'skin', 20, true),
(NULL::uuid, 'skin_care_procedures', 'Уходовые процедуры', 'skin', 30, true),
(NULL::uuid, 'skin_hardware', 'Аппаратная косметология', 'skin', 40, true),
(NULL::uuid, 'skin_injections', 'Инъекционная косметология', 'skin', 50, true),
(NULL::uuid, 'skin_massage_face', 'Массаж лица', 'skin', 60, true),
(NULL::uuid, 'massage_relaxing', 'Расслабляющий массаж', 'massage', 10, true),
(NULL::uuid, 'massage_therapeutic', 'Лечебный массаж', 'massage', 20, true),
(NULL::uuid, 'massage_anticellulite', 'Антицеллюлитный массаж', 'massage', 30, true),
(NULL::uuid, 'massage_lymphatic', 'Лимфодренажный массаж', 'massage', 40, true),
(NULL::uuid, 'massage_specialty', 'Авторские и специальные техники', 'massage', 50, true),
(NULL::uuid, 'massage_face', 'Массаж лица и головы', 'massage', 60, true),
(NULL::uuid, 'spa_wraps', 'Обёртывания', 'spa', 10, true),
(NULL::uuid, 'spa_body_scrub', 'Скрабы и пилинги тела', 'spa', 20, true),
(NULL::uuid, 'spa_programs', 'СПА-программы', 'spa', 30, true),
(NULL::uuid, 'spa_rituals', 'Ритуалы и хаммам', 'spa', 40, true),
(NULL::uuid, 'spa_body_care', 'Уход за кожей тела', 'spa', 50, true),
(NULL::uuid, 'spa_correction', 'Коррекция фигуры', 'spa', 60, true),
(NULL::uuid, 'spa_pressotherapy', 'Прессотерапия и лимфодренаж', 'spa', 70, true),
(NULL::uuid, 'depil_wax_sugar', 'Шугаринг и восковая депиляция', 'depilation', 10, true),
(NULL::uuid, 'depil_laser', 'Лазерная эпиляция', 'depilation', 20, true),
(NULL::uuid, 'depil_photo_elos', 'Фото- и ЭЛОС-эпиляция', 'depilation', 30, true),
(NULL::uuid, 'tanning_solarium', 'Солярий', 'tanning', 10, true),
(NULL::uuid, 'tanning_spray', 'Спрей-загар', 'tanning', 20, true),
(NULL::uuid, 'teeth_whitening', 'Отбеливание зубов', 'teeth', 10, true),
(NULL::uuid, 'teeth_hygiene', 'Гигиеническая чистка', 'teeth', 20, true),
(NULL::uuid, 'packages_bride', 'Образ невесты', 'packages', 10, true),
(NULL::uuid, 'packages_prom', 'Образ выпускницы', 'packages', 20, true),
(NULL::uuid, 'packages_beauty_day', 'День красоты', 'packages', 30, true),
(NULL::uuid, 'packages_other', 'Другие комплексы', 'packages', 40, true)
) AS v(salon_id, slug, name_ru, parent_slug, sort_order, is_system)
ON CONFLICT (slug) WHERE salon_id IS NULL DO NOTHING;
