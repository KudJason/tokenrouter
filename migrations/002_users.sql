-- TokenRouter MVP - User Management Migration
-- D1 Migration: 002_users

-- ============================================
-- Admin Users
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    last_login_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON admin_users(is_active) WHERE is_active = 1;

-- ============================================
-- Sessions (for JWT token management)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);
