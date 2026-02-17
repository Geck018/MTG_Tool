-- Remote Play tables (run if you already have schema applied)
-- wrangler d1 execute mtg-deckbuilder --remote --file=./src/database/migrations/001_remote_play.sql
-- wrangler d1 execute mtg-deckbuilder --local --file=./src/database/migrations/001_remote_play.sql

CREATE TABLE IF NOT EXISTS play_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  join_code TEXT NOT NULL UNIQUE,
  game_type TEXT NOT NULL DEFAULT 'mtg',
  host_username TEXT NOT NULL,
  settings TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS play_participants (
  session_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  seat_index INTEGER NOT NULL DEFAULT 0,
  life_total INTEGER,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, username),
  FOREIGN KEY (session_id) REFERENCES play_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS play_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES play_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_play_sessions_join_code ON play_sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_play_participants_session ON play_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_play_actions_session ON play_actions(session_id);
