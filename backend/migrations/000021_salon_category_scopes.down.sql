-- +migrate Down

DROP INDEX IF EXISTS idx_salon_category_scopes_salon;
DROP TABLE IF EXISTS salon_service_category_scopes;
