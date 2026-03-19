-- Migration 009: Add name, occupation, verification_level to users table
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN occupation TEXT;
ALTER TABLE users ADD COLUMN verification_level INTEGER DEFAULT 0 NOT NULL;
