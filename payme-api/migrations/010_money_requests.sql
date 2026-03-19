CREATE TABLE IF NOT EXISTS money_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  amount_usdc REAL NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_money_requests_target ON money_requests(target_id, status);
CREATE INDEX IF NOT EXISTS idx_money_requests_requester ON money_requests(requester_id, status);
