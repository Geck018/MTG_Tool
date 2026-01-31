/**
 * API Client for MTG Deck Builder
 * Connects to Cloudflare Worker backend
 */

import type { 
  User, DbCard, Deck, DeckSummary, 
  UserCollectionCard, UserDeck,
  CreateCardInput, CreateDeckInput 
} from '../database/types';

// API base URL - change for production
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class ApiError extends Error {
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
// USER API
// ============================================

export const userApi = {
  create: (username: string) => 
    fetchApi<User & { created: boolean }>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  get: (username: string) => 
    fetchApi<User>(`/api/users/${encodeURIComponent(username)}`),

  getCollection: (username: string) => 
    fetchApi<UserCollectionCard[]>(`/api/users/${encodeURIComponent(username)}/collection`),

  getDecks: (username: string) => 
    fetchApi<UserDeck[]>(`/api/users/${encodeURIComponent(username)}/decks`),
};

// ============================================
// CARD API
// ============================================

export const cardApi = {
  create: (card: CreateCardInput) => 
    fetchApi<{ id: number; name: string }>('/api/cards', {
      method: 'POST',
      body: JSON.stringify(card),
    }),

  get: (id: number) => 
    fetchApi<DbCard>(`/api/cards/${id}`),

  search: (query: string, limit = 50) => 
    fetchApi<DbCard[]>(`/api/cards?search=${encodeURIComponent(query)}&limit=${limit}`),

  addToCollection: (cardId: number, username: string, quantity = 1) => 
    fetchApi<{ card_id: number; username: string; added: boolean }>(`/api/cards/${cardId}/owners`, {
      method: 'POST',
      body: JSON.stringify({ username, quantity }),
    }),

  removeFromCollection: (cardId: number, username: string) => 
    fetchApi<{ deleted: boolean }>(`/api/cards/${cardId}/owners/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    }),
};

// ============================================
// DECK API
// ============================================

export interface DeckWithCards extends DeckSummary {
  cards: (DbCard & { quantity: number; is_sideboard: boolean; is_commander: boolean })[];
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

  update: (id: number, updates: Partial<Pick<Deck, 'name' | 'commander_card_id' | 'format' | 'description'>>) => 
    fetchApi<{ id: number; updated: boolean }>(`/api/decks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (id: number) => 
    fetchApi<{ deleted: boolean }>(`/api/decks/${id}`, {
      method: 'DELETE',
    }),

  addCard: (deckId: number, cardId: number, options: { quantity?: number; is_sideboard?: boolean; is_commander?: boolean } = {}) => 
    fetchApi<{ deck_id: number; card_id: number; added: boolean }>(`/api/decks/${deckId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ card_id: cardId, ...options }),
    }),

  removeCard: (deckId: number, cardId: number, sideboard = false) => 
    fetchApi<{ deleted: boolean }>(`/api/decks/${deckId}/cards/${cardId}?sideboard=${sideboard}`, {
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
  users: userApi,
  cards: cardApi,
  decks: deckApi,
  health: healthCheck,
};

export default api;
