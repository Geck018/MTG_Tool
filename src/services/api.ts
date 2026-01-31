/**
 * API Client for MTG Deck Builder
 * Connects to Cloudflare Worker backend
 * Cards are stored as references (scryfall_id only) - details fetched from Scryfall API
 */

import type { 
  User, Deck, DeckSummary, UserDeck, UserCard,
  CreateDeckInput 
} from '../database/types';

// API base URL - change for production
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'API request failed');
  }

  return data as T;
}

// ============================================
// AUTH API
// ============================================

export const authApi = {
  signup: (username: string, displayName?: string) => 
    fetchApi<User & { created: boolean }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, display_name: displayName }),
    }),

  login: (username: string) => 
    fetchApi<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  checkUsername: (username: string) => 
    fetchApi<{ available: boolean }>(`/api/auth/check/${encodeURIComponent(username)}`),
};

// ============================================
// USER API
// ============================================

export const userApi = {
  get: (username: string) => 
    fetchApi<User>(`/api/users/${encodeURIComponent(username)}`),

  // Returns scryfall_ids with quantities - fetch card details from Scryfall API
  getCollection: (username: string) => 
    fetchApi<UserCard[]>(`/api/users/${encodeURIComponent(username)}/collection`),

  getDecks: (username: string) => 
    fetchApi<UserDeck[]>(`/api/users/${encodeURIComponent(username)}/decks`),
};

// ============================================
// COLLECTION API (User's cards)
// ============================================

export const collectionApi = {
  addCard: (username: string, scryfallId: string, quantity = 1) => 
    fetchApi<{ scryfall_id: string; username: string; quantity: number; added: boolean }>('/api/collection/add', {
      method: 'POST',
      body: JSON.stringify({ username, scryfall_id: scryfallId, quantity }),
    }),

  updateQuantity: (username: string, scryfallId: string, quantity: number) => 
    fetchApi<{ scryfall_id: string; quantity?: number; updated?: boolean; removed?: boolean }>('/api/collection/update', {
      method: 'PUT',
      body: JSON.stringify({ username, scryfall_id: scryfallId, quantity }),
    }),

  removeCard: (username: string, scryfallId: string) => 
    fetchApi<{ deleted: boolean }>(`/api/collection/${encodeURIComponent(username)}/${encodeURIComponent(scryfallId)}`, {
      method: 'DELETE',
    }),
};

// ============================================
// DECK API
// ============================================

// Deck cards as returned by API (scryfall_ids only)
export interface DeckCardRef {
  scryfall_id: string;
  quantity: number;
  is_sideboard: boolean;
  is_commander: boolean;
}

export interface DeckWithCards extends DeckSummary {
  cards: DeckCardRef[];
  owners: { username: string; role: string }[];
}

export const deckApi = {
  create: (deck: CreateDeckInput) => 
    fetchApi<{ id: number; name: string; owner: string }>('/api/decks', {
      method: 'POST',
      body: JSON.stringify(deck),
    }),

  get: (id: number) => 
    fetchApi<DeckWithCards>(`/api/decks/${id}`),

  update: (id: number, updates: Partial<Pick<Deck, 'name' | 'commander_id' | 'format' | 'description'>>) => 
    fetchApi<{ id: number; updated: boolean }>(`/api/decks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (id: number) => 
    fetchApi<{ deleted: boolean }>(`/api/decks/${id}`, {
      method: 'DELETE',
    }),

  addCard: (deckId: number, scryfallId: string, options: { quantity?: number; is_sideboard?: boolean; is_commander?: boolean } = {}) => 
    fetchApi<{ deck_id: number; scryfall_id: string; added: boolean }>(`/api/decks/${deckId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ scryfall_id: scryfallId, ...options }),
    }),

  removeCard: (deckId: number, scryfallId: string, sideboard = false) => 
    fetchApi<{ deleted: boolean }>(`/api/decks/${deckId}/cards/${encodeURIComponent(scryfallId)}?sideboard=${sideboard}`, {
      method: 'DELETE',
    }),

  share: (deckId: number, username: string, role: 'owner' | 'editor' | 'viewer' = 'viewer') => 
    fetchApi<{ deck_id: number; username: string; role: string; shared: boolean }>(`/api/decks/${deckId}/share`, {
      method: 'POST',
      body: JSON.stringify({ username, role }),
    }),
};

// ============================================
// HEALTH CHECK
// ============================================

export const healthCheck = () => 
  fetchApi<{ status: string; timestamp: string }>('/api/health');

// Export all APIs
export const api = {
  auth: authApi,
  users: userApi,
  collection: collectionApi,
  decks: deckApi,
  health: healthCheck,
};

export default api;
