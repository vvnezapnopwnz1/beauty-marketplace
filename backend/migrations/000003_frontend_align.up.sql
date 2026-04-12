-- Add new fields to salons table for frontend alignment

ALTER TABLE salons 
    ADD COLUMN category_id text,
    ADD COLUMN business_type text DEFAULT 'venue',
    ADD COLUMN lat double precision,
    ADD COLUMN lng double precision,
    ADD COLUMN address text,
    ADD COLUMN district text,
    ADD COLUMN photo_url text,
    ADD COLUMN badge text,
    ADD COLUMN card_gradient text DEFAULT 'bg1',
    ADD COLUMN emoji text,
    ADD COLUMN cached_rating numeric(3, 2) DEFAULT 0,
    ADD COLUMN cached_review_count integer DEFAULT 0;
