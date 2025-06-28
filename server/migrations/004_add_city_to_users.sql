-- Add city column to users table
ALTER TABLE users ADD COLUMN city TEXT NOT NULL DEFAULT 'Unknown';
