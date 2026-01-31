-- MTG Deck Builder Database Schema
-- Compatible with SQLite / Cloudflare D1

-- Users table
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cards table (card instances in a collection)
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scryfall_id TEXT,                    -- Link to Scryfall API data
  name TEXT NOT NULL,
  mana_value INTEGER DEFAULT 0,
  power TEXT,                          -- TEXT because can be "*" or "X"
  toughness TEXT,                      -- TEXT because can be "*" or "X"
  card_type TEXT,                      -- Creature, Instant, etc.
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  commander_card_id INTEGER,           -- FK to cards (optional)
  format TEXT DEFAULT 'casual',        -- commander, standard, modern, etc.
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commander_card_id) REFERENCES cards(id) ON DELETE SET NULL
);

-- Junction: Card Owners (many-to-many: users <-> cards)
-- Tracks which users own which cards
CREATE TABLE IF NOT EXISTS card_owners (
  card_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,          -- How many copies they own
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id, username),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- Junction: Deck Owners (many-to-many: users <-> decks)
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

-- Junction: Deck Cards (many-to-many: decks <-> cards)
-- Tracks which cards are in which decks
CREATE TABLE IF NOT EXISTS deck_cards (
  deck_id INTEGER NOT NULL,
  card_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,          -- How many copies in this deck
  is_sideboard INTEGER DEFAULT 0,      -- 0 = main deck, 1 = sideboard
  is_commander INTEGER DEFAULT 0,      -- 0 = no, 1 = yes (for commander format)
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (deck_id, card_id, is_sideboard),
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_scryfall ON cards(scryfall_id);
CREATE INDEX IF NOT EXISTS idx_card_owners_username ON card_owners(username);
CREATE INDEX IF NOT EXISTS idx_deck_owners_username ON deck_owners(username);
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck ON deck_cards(deck_id);

-- Views for common queries

-- View: Deck with card count
CREATE VIEW IF NOT EXISTS deck_summary AS
SELECT 
  d.id,
  d.name,
  d.format,
  d.commander_card_id,
  c.name as commander_name,
  COALESCE(SUM(dc.quantity), 0) as card_count,
  d.created_at,
  d.updated_at
FROM decks d
LEFT JOIN cards c ON d.commander_card_id = c.id
LEFT JOIN deck_cards dc ON d.id = dc.deck_id
GROUP BY d.id;

-- View: User's collection with card details
CREATE VIEW IF NOT EXISTS user_collection AS
SELECT 
  co.username,
  c.id as card_id,
  c.name,
  c.mana_value,
  c.power,
  c.toughness,
  c.card_type,
  c.image_url,
  co.quantity
FROM card_owners co
JOIN cards c ON co.card_id = c.id;

-- View: User's decks
CREATE VIEW IF NOT EXISTS user_decks AS
SELECT 
  do.username,
  do.role,
  d.id as deck_id,
  d.name as deck_name,
  d.format,
  c.name as commander_name,
  (SELECT COALESCE(SUM(quantity), 0) FROM deck_cards WHERE deck_id = d.id) as card_count
FROM deck_owners do
JOIN decks d ON do.deck_id = d.id
LEFT JOIN cards c ON d.commander_card_id = c.id;
