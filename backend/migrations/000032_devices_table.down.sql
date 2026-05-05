-- Migration: 000032_devices_table.down
-- Description: Rollback devices table creation
-- Author: AI Agent

DROP TRIGGER IF EXISTS trigger_devices_updated_at ON devices;
DROP FUNCTION IF EXISTS update_devices_updated_at();
DROP INDEX IF EXISTS idx_devices_token;
DROP INDEX IF EXISTS idx_devices_platform;
DROP INDEX IF EXISTS idx_devices_user_id;
DROP TABLE IF EXISTS devices;
