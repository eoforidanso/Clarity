-- Add daily token limit columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_tokens_remaining INTEGER NOT NULL DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_token_reset_at TIMESTAMP NULL;
