-- TokenRouter MVP - Initial Schema
-- D1 Migration: 001_initial_schema

-- ============================================
-- Audit Logs
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    company_id TEXT NOT NULL,
    user_id TEXT,
    original_text_hash TEXT,
    masked_text TEXT,
    pii_detected INTEGER DEFAULT 0,
    enterprise_masked INTEGER DEFAULT 0,
    provider TEXT,
    model TEXT,
    risk_level TEXT,
    status TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_risk ON audit_logs(risk_level) WHERE risk_level = 'high';

-- ============================================
-- Enterprise Ontologies Metadata
-- ============================================
CREATE TABLE IF NOT EXISTS ontologies (
    company_id TEXT PRIMARY KEY,
    ttl_file_key TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,
    version TEXT NOT NULL,
    entity_count INTEGER DEFAULT 0,
    last_modified INTEGER DEFAULT (unixepoch())
);

-- ============================================
-- API Keys
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    key_hash TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    key_name TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    is_active INTEGER DEFAULT 1,
    rate_limit_rpm INTEGER DEFAULT 100
);

CREATE INDEX IF NOT EXISTS idx_apikeys_company ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_active ON api_keys(is_active) WHERE is_active = 1;

-- ============================================
-- Compliance Rules
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    annex_category TEXT,
    risk_level TEXT NOT NULL,
    conditions TEXT NOT NULL,  -- JSON
    actions TEXT NOT NULL,     -- JSON
    is_enabled INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_rules_enabled ON compliance_rules(is_enabled) WHERE is_enabled = 1;
CREATE INDEX IF NOT EXISTS idx_rules_annex ON compliance_rules(annex_category);

-- ============================================
-- Companies
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'basic',
    created_at INTEGER DEFAULT (unixepoch()),
    settings TEXT DEFAULT '{}'  -- JSON
);

-- ============================================
-- Usage Stats (for billing)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_stats (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    date TEXT NOT NULL,  -- YYYY-MM-DD
    provider TEXT NOT NULL,
    model TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    UNIQUE(company_id, date, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_usage_company ON usage_stats(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_stats(date DESC);
