-- Add token limits to api_keys table
ALTER TABLE api_keys ADD COLUMN token_limit INTEGER DEFAULT 100000;
ALTER TABLE api_keys ADD COLUMN token_used INTEGER DEFAULT 0;
