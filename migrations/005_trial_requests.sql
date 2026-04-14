-- TokenRouter MVP - Trial Requests Migration
-- D1 Migration: 005_trial_requests

-- ============================================
-- Trial Requests
-- ============================================
CREATE TABLE IF NOT EXISTS trial_requests (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    industry TEXT NOT NULL,
    email TEXT NOT NULL,
    employees TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_trial_status ON trial_requests(status);
CREATE INDEX IF NOT EXISTS idx_trial_created ON trial_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trial_email ON trial_requests(email);
