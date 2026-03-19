-- Add bonus_claimed and username_claimed tracking to users
ALTER TABLE users ADD COLUMN bonus_claimed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN username_claimed INTEGER DEFAULT 0;

-- Add support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_messages_user ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at);

-- Expand transactions table with extra metadata columns
ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT 'send';
ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'USDC';
ALTER TABLE transactions ADD COLUMN fee REAL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN category TEXT;
ALTER TABLE transactions ADD COLUMN narration TEXT;
ALTER TABLE transactions ADD COLUMN memo TEXT;
ALTER TABLE transactions ADD COLUMN client_ref TEXT;
ALTER TABLE transactions ADD COLUMN display_amount REAL;
ALTER TABLE transactions ADD COLUMN display_currency TEXT;
ALTER TABLE transactions ADD COLUMN display_symbol TEXT;

-- Mark existing users as having claimed usernames (they already have valid usernames)
UPDATE users SET username_claimed = 1 WHERE username IS NOT NULL AND length(username) >= 3;
