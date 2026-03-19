-- Add gifts table for tracking gift airdrops
CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  amount_usdc REAL NOT NULL,
  is_anonymous INTEGER DEFAULT 0,
  acknowledged INTEGER DEFAULT 0,
  solana_signature TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gifts_sender ON gifts(sender_id);
CREATE INDEX IF NOT EXISTS idx_gifts_recipient ON gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gifts_created ON gifts(created_at);
