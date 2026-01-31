// Database Types for MTG Deck Builder
// Cards are stored as references only (scryfall_id) - details fetched from API

export interface User {
  username: string;
  display_name?: string;
  created_at?: string;
}

// Card reference - just the scryfall_id
// Actual card details come from Scryfall API
export interface CardRef {
  scryfall_id: string;
}

export interface Deck {
  id: number;
  name: string;
  commander_id?: string;  // scryfall_id of commander
  format: 'casual' | 'commander' | 'standard' | 'modern' | 'legacy' | 'vintage' | 'pauper' | 'pioneer';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserCard {
  scryfall_id: string;
  username: string;
  quantity: number;
  added_at?: string;
}

export interface DeckOwner {
  deck_id: number;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  added_at?: string;
}

export interface DeckCard {
  deck_id: number;
  scryfall_id: string;
  quantity: number;
  is_sideboard: boolean;
  is_commander: boolean;
  added_at?: string;
}

// View types (for query results)

export interface DeckSummary {
  id: number;
  name: string;
  format: string;
  commander_id?: string;
  description?: string;
  card_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserDeck {
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  deck_id: number;
  deck_name: string;
  format: string;
  commander_id?: string;
  description?: string;
  card_count: number;
  created_at?: string;
  updated_at?: string;
}

// Input types for creating/updating

export interface SignupInput {
  username: string;
  display_name?: string;
}

export interface CreateDeckInput {
  name: string;
  commander_id?: string;  // scryfall_id
  format?: Deck['format'];
  description?: string;
  owner_username: string;
}

export interface AddCardToCollectionInput {
  scryfall_id: string;
  username: string;
  quantity?: number;
}

export interface AddCardToDeckInput {
  deck_id: number;
  scryfall_id: string;
  quantity?: number;
  is_sideboard?: boolean;
  is_commander?: boolean;
}

export interface ShareDeckInput {
  deck_id: number;
  username: string;
  role?: DeckOwner['role'];
}
