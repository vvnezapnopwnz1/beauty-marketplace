-- Restore external_source / external_id columns to salons and drop salon_external_ids.
-- NOTE: if a salon had multiple external sources, only one is restored (ORDER BY source).

ALTER TABLE salons
    ADD COLUMN external_source text NOT NULL DEFAULT '',
    ADD COLUMN external_id     text NOT NULL DEFAULT '';

UPDATE salons s SET
    external_source = (
        SELECT source      FROM salon_external_ids WHERE salon_id = s.id ORDER BY source LIMIT 1
    ),
    external_id = (
        SELECT external_id FROM salon_external_ids WHERE salon_id = s.id ORDER BY source LIMIT 1
    );

ALTER TABLE salons
    ALTER COLUMN external_source DROP DEFAULT,
    ALTER COLUMN external_id     DROP DEFAULT,
    ADD CONSTRAINT salons_external_key UNIQUE (external_source, external_id);

DROP TABLE salon_external_ids;
