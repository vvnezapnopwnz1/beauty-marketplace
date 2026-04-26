-- +migrate Up

ALTER TABLE salon_clients
    ADD COLUMN deleted_at TIMESTAMPTZ NULL DEFAULT NULL;

CREATE INDEX idx_salon_clients_deleted_at
    ON salon_clients (deleted_at)
    WHERE deleted_at IS NOT NULL;
