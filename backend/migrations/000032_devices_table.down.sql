-- Migration: 000032_devices_table.down.sql
-- Description: Drop devices table for push notification registration
-- Author: AI Agent

DROP TRIGGER IF EXISTS trigger_devices_updated_at ON devices;
DROP FUNCTION IF EXISTS update_devices_updated_at();
DROP TABLE IF EXISTS devices;