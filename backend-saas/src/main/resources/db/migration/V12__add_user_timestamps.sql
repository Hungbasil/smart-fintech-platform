-- V12__add_user_timestamps.sql
-- Add createdAt and lastLogin columns to track user registration and activity

ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP DEFAULT NULL;

-- Set created_at for existing users to current time
UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- Make created_at NOT NULL after setting
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
