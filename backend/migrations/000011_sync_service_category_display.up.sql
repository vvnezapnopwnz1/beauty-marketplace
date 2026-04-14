-- Align services.category with service_categories.name_ru when category_slug references a system row.
UPDATE services AS srv
SET category = sc.name_ru
FROM service_categories AS sc
WHERE srv.category_slug IS NOT NULL
  AND TRIM(srv.category_slug) = sc.slug
  AND sc.salon_id IS NULL
  AND (srv.category IS DISTINCT FROM sc.name_ru);
