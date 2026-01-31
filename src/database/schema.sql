-- MTG Deck Builder Database Schema
-- Compatible with SQLite / Cloudflare D1
-- Cards are stored as references (scryfall_id only) - details fetched from API

-- Users table (simple username-based auth)
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  display_name TEXT,                   -- Optional display name
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cards table (REFERENCE ONLY - just scryfall_id, no card details)
-- Card details are fetched from Scryfall API when needed
CREATE TABLE IF NOT EXISTS cards (
  scryfall_id TEXT PRIMARY KEY         -- Scryfall ID is the only identifier we store
);

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  commander_id TEXT,                   -- Scryfall ID of commander (optional)
  format TEXT DEFAULT 'casual',        -- commander, standard, modern, etc.
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commander_id) REFERENCES cards(scryfall_id) ON DELETE SET NULL
);

-- User's card collection (many-to-many: users <-> cards)
-- Tracks which users own which cards (by scryfall_id)
CREATE TABLE IF NOT EXISTS user_cards (
  scryfall_id TEXT NOT NULL,
  username TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,          -- How many copies they own
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scryfall_id, username),
  FOREIGN KEY (scryfall_id) REFERENCES cards(scryfall_id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- Deck ownership (many-to-many: users <-> decks)
-- Tracks which users own/can access which decks
CREATE TABLE IF NOT EXISTS deck_owners (
  deck_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  role TEXT DEFAULT 'owner',           -- 'owner', 'editor', 'viewer'
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (deck_id, username),
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- Cards in decks (many-to-many: decks <-> cards)
-- Tracks which cards are in which decks (by scryfall_id)
CREATE TABLE IF NOT EXISTS deck_cards (
  deck_id INTEGER NOT NULL,
  scryfall_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,          -- How many copies in this deck
  is_sideboard INTEGER DEFAULT 0,      -- 0 = main deck, 1 = sideboard
  is_commander INTEGER DEFAULT 0,      -- 0 = no, 1 = yes (for commander format)
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (deck_id, scryfall_id, is_sideboard),
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  FOREIGN KEY (scryfall_id) REFERENCES cards(scryfall_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_cards_username ON user_cards(username);
CREATE INDEX IF NOT EXISTS idx_deck_owners_username ON deck_owners(username);
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck ON deck_cards(deck_id);

-- View: User's decks with card count
CREATE VIEW IF NOT EXISTS user_decks AS
SELECT 
  do.username,
  do.role,
  d.id as deck_id,
  d.name as deck_name,
  d.format,
  d.commander_id,
  d.description,
  d.created_at,
  d.updated_at,
  (SELECT COALESCE(SUM(quantity), 0) FROM deck_cards WHERE deck_id = d.id) as card_count
FROM deck_owners do
JOIN decks d ON do.deck_id = d.id;

-- View: Deck summary
CREATE VIEW IF NOT EXISTS deck_summary AS
SELECT 
  d.id,
  d.name,
  d.format,
  d.commander_id,
  d.description,
  COALESCE(SUM(dc.quantity), 0) as card_count,
  d.created_at,
  d.updated_at
FROM decks d
LEFT JOIN deck_cards dc ON d.id = dc.deck_id
GROUP BY d.id;
