-- ============================================================
-- SmartSec — Schema Migration v2
-- Run this in Supabase SQL Editor AFTER the base schema.
-- Adds source_ip tracking for real IDS data.
-- ============================================================

-- Add source_ip to user_activity (real client IP from middleware)
ALTER TABLE user_activity
  ADD COLUMN IF NOT EXISTS source_ip VARCHAR(45);

-- Add source_ip to alerts (real IP of the suspicious client)
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS source_ip VARCHAR(45);

-- Index for fast IP-based lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_source_ip ON user_activity(source_ip);
CREATE INDEX IF NOT EXISTS idx_alerts_source_ip        ON alerts(source_ip);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('user_activity', 'alerts')
  AND column_name = 'source_ip';
