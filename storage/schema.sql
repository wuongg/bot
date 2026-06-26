CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  meta TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS picks (
  discord_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  number INTEGER NOT NULL UNIQUE,
  PRIMARY KEY (discord_id, level)
);

CREATE INDEX IF NOT EXISTS idx_picks_number ON picks(number);

CREATE TABLE IF NOT EXISTS duels (
  id TEXT PRIMARY KEY,
  challenger_id TEXT NOT NULL,
  opponent_id TEXT NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  xp_json TEXT NOT NULL DEFAULT '{}',
  resolved INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_duels_active ON duels(resolved, end_at);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS xp_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  level INTEGER,
  streak INTEGER,
  granted TEXT,
  leveled_up INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_xp_logs_user ON xp_logs(discord_id, id DESC);

CREATE TABLE IF NOT EXISTS content_fingerprints (
  fingerprint TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_fp_user ON content_fingerprints(discord_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_fp_time ON content_fingerprints(created_at);
