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

// Deck cards as returned by API (scryfall_ids only; name/mana_cost when with_names=1)
export interface DeckCardRef {
  scryfall_id: string;
  quantity: number;
  is_sideboard: boolean;
  is_commander: boolean;
  name?: string;
  mana_cost?: string;
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

  get: (id: number, withNames = false) =>
    fetchApi<DeckWithCards>(`/api/decks/${id}${withNames ? '?with_names=1' : ''}`),

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

  /** Resolve card names to scryfall_id + name via server (use when Scryfall is blocked from client). */
  resolveList: (cards: Array<{ quantity: number; name: string; set?: string }>) =>
    fetchApi<{ resolved: Array<{ scryfall_id: string; name: string; quantity: number }>; not_found: string[] }>(
      '/api/decks/resolve-list',
      { method: 'POST', body: JSON.stringify({ cards }) }
    ),

  share: (deckId: number, username: string, role: 'owner' | 'editor' | 'viewer' = 'viewer') => 
    fetchApi<{ deck_id: number; username: string; role: string; shared: boolean }>(`/api/decks/${deckId}/share`, {
      method: 'POST',
      body: JSON.stringify({ username, role }),
    }),
};

// ============================================
// REMOTE PLAY (low-bandwidth friendly)
// ============================================

export interface PlayParticipant {
  username: string;
  seat_index: number;
  life_total: number | null;
  joined_at: string;
}

export interface PlayAction {
  id: number;
  username: string;
  action_type: string;
  payload: string | null;
  created_at: string;
}

export interface PlaySessionState {
  id: number;
  join_code: string;
  game_type: string;
  host_username: string;
  settings: string | null;
  created_at: string;
  updated_at: string;
  participants: PlayParticipant[];
  actions: PlayAction[];
}

export const playApi = {
  createSession: (hostUsername: string, gameType = 'mtg', settings?: string) =>
    fetchApi<{
      id: number;
      join_code: string;
      game_type: string;
      host_username: string;
      settings: string;
      created: boolean;
    }>('/api/play/sessions', {
      method: 'POST',
      body: JSON.stringify({
        host_username: hostUsername,
        game_type: gameType,
        settings: settings ?? (gameType === 'mtg' ? JSON.stringify({ starting_life: 40 }) : undefined),
      }),
    }),

  getSession: (joinCode: string, sinceActionId?: number) => {
    const url = sinceActionId
      ? `/api/play/sessions/${encodeURIComponent(joinCode)}?since=${sinceActionId}`
      : `/api/play/sessions/${encodeURIComponent(joinCode)}`;
    return fetchApi<PlaySessionState>(url);
  },

  joinSession: (joinCode: string, username: string) =>
    fetchApi<{ session_id: number; join_code: string; joined: boolean; already_in?: boolean }>(
      `/api/play/sessions/${encodeURIComponent(joinCode.toUpperCase())}/join`,
      {
        method: 'POST',
        body: JSON.stringify({ username }),
      }
    ),

  leaveSession: (joinCode: string, username: string) =>
    fetchApi<{ left: boolean }>(
      `/api/play/sessions/${encodeURIComponent(joinCode.toUpperCase())}/leave`,
      {
        method: 'POST',
        body: JSON.stringify({ username }),
      }
    ),

  submitAction: (
    joinCode: string,
    username: string,
    actionType: string,
    payload?: Record<string, unknown> | string
  ) =>
    fetchApi<{ action_submitted: boolean }>(
      `/api/play/sessions/${encodeURIComponent(joinCode.toUpperCase())}/actions`,
      {
        method: 'POST',
        body: JSON.stringify({
          username,
          action_type: actionType,
          payload: payload ?? null,
        }),
      }
    ),

  setLife: (joinCode: string, username: string, lifeTotal: number) =>
    fetchApi<{ updated: boolean; life_total: number }>(
      `/api/play/sessions/${encodeURIComponent(joinCode.toUpperCase())}/players/${encodeURIComponent(username)}/life`,
      {
        method: 'PUT',
        body: JSON.stringify({ life_total: lifeTotal }),
      }
    ),
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
  play: playApi,
  health: healthCheck,
};

export default api;
