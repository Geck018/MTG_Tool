export interface Card {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors: string[];
  color_identity: string[];
  rarity: string;
  set_name: string;
  collector_number: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
  };
  prices?: {
    usd?: string;
    usd_foil?: string;
  };
  keywords?: string[];
  legalities?: {
    [format: string]: string;
  };
}

export interface DeckCard {
  card: Card;
  quantity: number;
}

export interface Deck {
  name: string;
  cards: DeckCard[];
  sideboard: DeckCard[];
  wishlist: DeckCard[];
}

export interface BulkCard {
  name: string;
  quantity: number;
  set?: string;
  collector_number?: string;
}

export interface KeywordRule {
  keyword: string;
  definition: string;
  reminder?: string;
}

export interface CardRuling {
  source: string;
  published_at: string;
  comment: string;
}

export interface CardCombo {
  cardName: string;
  reason: string;
  synergy: 'high' | 'medium' | 'low';
}
