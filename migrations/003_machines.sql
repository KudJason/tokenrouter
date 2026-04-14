-- Add machine management columns to api_keys table
ALTER TABLE api_keys ADD COLUMN machine_name TEXT;
ALTER TABLE api_keys ADD COLUMN is_enabled INTEGER DEFAULT 1;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_provider ON usage_stats(provider);
CREATE INDEX IF NOT EXISTS idx_usage_stats_company_date ON usage_stats(company_id, date);
