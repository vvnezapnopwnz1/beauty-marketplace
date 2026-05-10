BEGIN;

ALTER TABLE service_categories
    DROP COLUMN IF EXISTS specialist_title_en,
    DROP COLUMN IF EXISTS specialist_title_ru,
    DROP COLUMN IF EXISTS parent_name_en,
    DROP COLUMN IF EXISTS parent_name_ru,
    DROP COLUMN IF EXISTS name_en;

COMMIT;
