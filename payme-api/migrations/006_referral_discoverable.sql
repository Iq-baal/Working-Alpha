-- Migration 006: Referral system, discoverable toggle, notification prefs, security question, invite validation
ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN referred_by TEXT;
ALTER TABLE users ADD COLUMN pay_points INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN discoverable INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE users ADD COLUMN notification_prefs TEXT;
ALTER TABLE users ADD COLUMN security_question TEXT;
ALTER TABLE users ADD COLUMN security_answer_hash TEXT;
ALTER TABLE users ADD COLUMN invite_validated INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN password_version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Backfill existing users so they are not blocked by the new gate
UPDATE users SET invite_validated = 1;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_pay_points ON users(pay_points DESC);
