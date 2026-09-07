CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact TEXT,
  project TEXT,
  location TEXT,
  project_type TEXT NOT NULL,
  budget TEXT NOT NULL,
  needs TEXT NOT NULL,
  brand TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'completed'))
);

CREATE INDEX IF NOT EXISTS requests_status_created_idx ON requests (status, created_at DESC);
