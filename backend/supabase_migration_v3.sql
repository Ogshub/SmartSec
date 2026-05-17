-- ============================================================
-- SmartSec — Full Migration v3 (Run in Supabase SQL Editor)
-- ============================================================
-- Run this manually:
-- 1. Go to https://supabase.com → Project → SQL Editor
-- 2. Paste this entire file and click RUN
-- ============================================================

-- Add missing columns to existing tables
ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS source_ip VARCHAR(45);
ALTER TABLE alerts        ADD COLUMN IF NOT EXISTS source_ip VARCHAR(45);

-- Add missing user profile columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name     VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number  VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location      VARCHAR(100) DEFAULT 'Not specified';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color  VARCHAR(20)  DEFAULT '#6366f1';
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type  VARCHAR(30)  DEFAULT 'Standard User';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_settings JSONB        DEFAULT '{}';

-- ============================================================
-- TABLE: risk_events — Audit trail for risk score changes
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type  VARCHAR(50)  NOT NULL,
    severity    VARCHAR(10)  NOT NULL DEFAULT 'Low',
    score_delta FLOAT        NOT NULL DEFAULT 0,
    description TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_events_user    ON risk_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_created ON risk_events(created_at DESC);

-- ============================================================
-- TABLE: notifications — In-app notification center
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(120) NOT NULL,
    message     TEXT         NOT NULL,
    type        VARCHAR(20)  NOT NULL DEFAULT 'info',
    is_read     BOOLEAN      DEFAULT FALSE,
    link        VARCHAR(200),
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- TABLE: ip_intel — Cache for enriched IP intelligence
-- ============================================================
CREATE TABLE IF NOT EXISTS ip_intel (
    ip            VARCHAR(45)  PRIMARY KEY,
    country       VARCHAR(80),
    country_code  VARCHAR(5),
    city          VARCHAR(80),
    org           VARCHAR(120),
    abuse_score   INTEGER      DEFAULT 0,
    total_reports INTEGER      DEFAULT 0,
    is_tor        BOOLEAN      DEFAULT FALSE,
    is_vpn        BOOLEAN      DEFAULT FALSE,
    is_malicious  BOOLEAN      DEFAULT FALSE,
    label         VARCHAR(100),
    flag_emoji    VARCHAR(10),
    raw_data      JSONB,
    fetched_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- Verify all tables exist
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
