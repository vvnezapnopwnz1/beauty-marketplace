-- Migrate external IDs from salons table into a separate salon_external_ids table.
-- This allows one salon to be linked to multiple geo-sources (2GIS, Yandex, Google, etc.)
-- and stores per-source metadata (booking_url, rating snapshot, etc.) in the meta JSONB column.

CREATE TABLE salon_external_ids (
    salon_id    uuid NOT NULL REFERENCES salons (id) ON DELETE CASCADE,
    source      text NOT NULL,       -- e.g. '2gis', 'yandex', 'google'
    external_id text NOT NULL,
    meta        jsonb,               -- source-specific data: booking_url, promo_url, etc.
    synced_at   timestamptz,
    PRIMARY KEY (salon_id, source),
    CONSTRAINT salon_external_ids_source_extid_key UNIQUE (source, external_id)
);

CREATE INDEX idx_salon_external_ids_salon_id ON salon_external_ids (salon_id);

-- Migrate existing data from the old columns.
INSERT INTO salon_external_ids (salon_id, source, external_id)
SELECT id, external_source, external_id FROM salons;

-- Drop the old columns and their unique constraint.
ALTER TABLE salons
    DROP CONSTRAINT salons_external_key,
    DROP COLUMN external_source,
    DROP COLUMN external_id;

COMMENT ON TABLE salon_external_ids IS 'Maps our internal salon to IDs in external geo-services. PRIMARY KEY (salon_id, source) ensures one ID per source per salon. UNIQUE (source, external_id) prevents the same external object from being linked to two salons.';
COMMENT ON COLUMN salon_external_ids.meta IS 'Source-specific JSON payload, e.g. {"booking_url": "...", "rating": 4.8}. Written by sync jobs, read-only for the API.';
