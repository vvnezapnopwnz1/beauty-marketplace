-- +migrate Down

DROP INDEX IF EXISTS idx_salon_clients_deleted_at;

ALTER TABLE salon_clients
    DROP COLUMN IF EXISTS deleted_at;
