ALTER TABLE services DROP COLUMN IF EXISTS category_slug;
ALTER TABLE salons DROP COLUMN IF EXISTS salon_type;
DROP TABLE IF EXISTS service_categories;
