-- +migrate Up

CREATE TABLE salon_service_category_scopes (
    salon_id     UUID        NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    parent_slug  TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (salon_id, parent_slug)
);

CREATE INDEX idx_salon_category_scopes_salon
    ON salon_service_category_scopes (salon_id);

-- Backfill from existing salons.salon_type.
INSERT INTO salon_service_category_scopes (salon_id, parent_slug)
SELECT s.id, scope.parent_slug
FROM salons s
CROSS JOIN LATERAL (
    SELECT UNNEST(
        CASE s.salon_type
            WHEN 'hair_salon' THEN ARRAY['hair','packages']::TEXT[]
            WHEN 'barbershop' THEN ARRAY['barbershop','packages']::TEXT[]
            WHEN 'nail_studio' THEN ARRAY['nails','packages']::TEXT[]
            WHEN 'brow_bar' THEN ARRAY['brows','lashes','permanent','packages']::TEXT[]
            WHEN 'lash_studio' THEN ARRAY['lashes','brows','permanent','packages']::TEXT[]
            WHEN 'permanent_studio' THEN ARRAY['permanent','brows','makeup','packages']::TEXT[]
            WHEN 'makeup_artist' THEN ARRAY['makeup','hair','packages']::TEXT[]
            WHEN 'cosmetologist' THEN ARRAY['skin','permanent','massage','packages']::TEXT[]
            WHEN 'spa_massage' THEN ARRAY['spa','massage','skin','depilation','packages']::TEXT[]
            WHEN 'depilation_studio' THEN ARRAY['depilation','packages']::TEXT[]
            WHEN 'tanning_studio' THEN ARRAY['tanning','packages']::TEXT[]
            WHEN 'beauty_salon' THEN ARRAY['hair','barbershop','nails','brows','lashes','permanent','makeup','skin','massage','spa','depilation','tanning','teeth','packages']::TEXT[]
            WHEN 'individual' THEN ARRAY['hair','barbershop','nails','brows','lashes','permanent','makeup','skin','massage','spa','depilation','tanning','teeth','packages']::TEXT[]
            ELSE ARRAY[]::TEXT[]
        END
    ) AS parent_slug
) AS scope
ON CONFLICT (salon_id, parent_slug) DO NOTHING;
