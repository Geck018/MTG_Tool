// Database Types for MTG Deck Builder

export interface User {
  username: string;
  created_at?: string;
}

export interface DbCard {
  id: number;
  scryfall_id?: string;
  name: string;
  mana_value: number;
  power?: string;
  toughness?: string;
  card_type?: string;
  image_url?: string;
  created_at?: string;
}

export interface Deck {
  id: number;
  name: string;
  commander_card_id?: number;
  format: 'casual' | 'commander' | 'standard' | 'modern' | 'legacy' | 'vintage' | 'pauper' | 'pioneer';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CardOwner {
  card_id: number;
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
  card_id: number;
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
  commander_card_id?: number;
  commander_name?: string;
  card_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserCollectionCard {
  username: string;
  card_id: number;
  name: string;
  mana_value: number;
  power?: string;
  toughness?: string;
  card_type?: string;
  image_url?: string;
  quantity: number;
}

export interface UserDeck {
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  deck_id: number;
  deck_name: string;
  format: string;
  commander_name?: string;
  card_count: number;
}

// Input types for creating/updating

export interface CreateUserInput {
  username: string;
}

export interface CreateCardInput {
  scryfall_id?: string;
  name: string;
  mana_value?: number;
  power?: string;
  toughness?: string;
  card_type?: string;
  image_url?: string;
}

export interface CreateDeckInput {
  name: string;
  commander_card_id?: number;
  format?: Deck['format'];
  description?: string;
  owner_username: string;
}

export interface AddCardToCollectionInput {
  card_id: number;
  username: string;
  quantity?: number;
}

export interface AddCardToDeckInput {
  deck_id: number;
  card_id: number;
  quantity?: number;
  is_sideboard?: boolean;
  is_commander?: boolean;
}

export interface ShareDeckInput {
  deck_id: number;
  username: string;
  role?: DeckOwner['role'];
}

export interface ShareCardInput {
  card_id: number;
  username: string;
  quantity?: number;
}
