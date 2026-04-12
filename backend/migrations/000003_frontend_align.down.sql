-- Remove fields added for frontend alignment

ALTER TABLE salons 
    DROP COLUMN category_id,
    DROP COLUMN business_type,
    DROP COLUMN lat,
    DROP COLUMN lng,
    DROP COLUMN address,
    DROP COLUMN district,
    DROP COLUMN photo_url,
    DROP COLUMN badge,
    DROP COLUMN card_gradient,
    DROP COLUMN emoji,
    DROP COLUMN cached_rating,
    DROP COLUMN cached_review_count;
