-- TokenRouter MVP - Privacy Reports Migration
-- D1 Migration: 004_privacy_reports

-- ============================================
-- Privacy Reports
-- ============================================
CREATE TABLE IF NOT EXISTS privacy_reports (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    task_type TEXT,
    data_size_bytes INTEGER DEFAULT 0,
    pii_count INTEGER DEFAULT 0,
    pii_types TEXT, -- JSON object with counts per type
    sensitivity_level TEXT, -- 'none', 'low', 'medium', 'high'
    operations TEXT, -- JSON array of operations
    compute_time_ms INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_privacy_company ON privacy_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_privacy_created ON privacy_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_sensitivity ON privacy_reports(sensitivity_level) WHERE sensitivity_level = 'high';
