/**
 * MTG Deck Builder API Worker
 * Handles all database operations via Cloudflare D1
 * Cards are stored as references (scryfall_id only) - details fetched from Scryfall API
 */

export interface Env {
  DB: D1Database;
}

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to create JSON response
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Helper to parse request body
async function parseBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

const SCRYFALL_BASE = 'https://api.scryfall.com';
const SCRYFALL_COLLECTION = `${SCRYFALL_BASE}/cards/collection`;
const SCRYFALL_BATCH_SIZE = 75;

/** Resolve a card by name (and optional set) via Scryfall. Server-side only. */
async function fetchCardByName(name: string, set?: string): Promise<{ id: string; name: string } | null> {
  const isSetCode = set && /^[a-zA-Z0-9]{2,5}$/.test(set);
  let url = `${SCRYFALL_BASE}/cards/named?exact=${encodeURIComponent(name)}`;
  if (isSetCode) url += `&set=${encodeURIComponent(set.toLowerCase())}`;
  let res = await fetch(url);
  if (!res.ok && isSetCode) {
    url = `${SCRYFALL_BASE}/cards/named?exact=${encodeURIComponent(name)}`;
    res = await fetch(url);
  }
  if (!res.ok) {
    url = `${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`;
    res = await fetch(url);
  }
  if (!res.ok) return null;
  const card = (await res.json()) as { id: string; name: string };
  return { id: card.id, name: card.name };
}

/** Fetch card name (and mana_cost) for scryfall_ids from Scryfall API. Server-side only. */
async function fetchCardNamesFromScryfall(scryfallIds: string[]): Promise<Map<string, { name: string; mana_cost?: string }>> {
  const map = new Map<string, { name: string; mana_cost?: string }>();
  for (let i = 0; i < scryfallIds.length; i += SCRYFALL_BATCH_SIZE) {
    const batch = scryfallIds.slice(i, i + SCRYFALL_BATCH_SIZE);
    const body = JSON.stringify({ identifiers: batch.map((id) => ({ id })) });
    const res = await fetch(SCRYFALL_COLLECTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) continue;
    const data = (await res.json()) as { data?: Array<{ id: string; name: string; mana_cost?: string }>; not_found?: unknown[] };
    for (const c of data.data ?? []) {
      map.set(c.id, { name: c.name, mana_cost: c.mana_cost });
    }
  }
  return map;
}

// Route handler type
type RouteHandler = (request: Request, env: Env, params: Record<string, string>) => Promise<Response>;

// Simple router
const routes: { method: string; pattern: RegExp; handler: RouteHandler }[] = [];

function addRoute(method: string, path: string, handler: RouteHandler) {
  // Convert path like /users/:username to regex
  const pattern = new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
  routes.push({ method, pattern, handler });
}

// ============================================
// AUTH ROUTES (Simple username-based)
// ============================================

// Signup - create new user
addRoute('POST', '/api/auth/signup', async (request, env) => {
  const { username, display_name } = await parseBody<{ username: string; display_name?: string }>(request);
  
  if (!username || username.length < 3) {
    return jsonResponse({ error: 'Username must be at least 3 characters' }, 400);
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return jsonResponse({ error: 'Username can only contain letters, numbers, and underscores' }, 400);
  }

  try {
    await env.DB.prepare(
      'INSERT INTO users (username, display_name) VALUES (?, ?)'
    ).bind(username.toLowerCase(), display_name || username).run();
    
    return jsonResponse({ 
      username: username.toLowerCase(), 
      display_name: display_name || username,
      created: true 
    }, 201);
  } catch (e: unknown) {
    const error = e as Error;
    if (error.message?.includes('UNIQUE constraint')) {
      return jsonResponse({ error: 'Username already taken' }, 409);
    }
    throw e;
  }
});

// Login - just verify user exists
addRoute('POST', '/api/auth/login', async (request, env) => {
  const { username } = await parseBody<{ username: string }>(request);
  
  if (!username) {
    return jsonResponse({ error: 'Username is required' }, 400);
  }

  const user = await env.DB.prepare(
    'SELECT username, display_name, created_at FROM users WHERE username = ?'
  ).bind(username.toLowerCase()).first();
  
  if (!user) {
    return jsonResponse({ error: 'User not found. Please sign up first.' }, 404);
  }
  
  return jsonResponse(user);
});

// Check if username is available
addRoute('GET', '/api/auth/check/:username', async (_request, env, params) => {
  const user = await env.DB.prepare(
    'SELECT username FROM users WHERE username = ?'
  ).bind(params.username.toLowerCase()).first();
  
  return jsonResponse({ available: !user });
});

// ============================================
// USER ROUTES
// ============================================

// Get user profile
addRoute('GET', '/api/users/:username', async (_request, env, params) => {
  const user = await env.DB.prepare(
    'SELECT username, display_name, created_at FROM users WHERE username = ?'
  ).bind(params.username.toLowerCase()).first();
  
  if (!user) {
    return jsonResponse({ error: 'User not found' }, 404);
  }
  
  return jsonResponse(user);
});

// Get user's card collection (just scryfall_ids and quantities)
addRoute('GET', '/api/users/:username/collection', async (_request, env, params) => {
  const cards = await env.DB.prepare(`
    SELECT scryfall_id, quantity, added_at 
    FROM user_cards 
    WHERE username = ?
    ORDER BY added_at DESC
  `).bind(params.username.toLowerCase()).all();
  
  return jsonResponse(cards.results);
});

// Get user's decks
addRoute('GET', '/api/users/:username/decks', async (_request, env, params) => {
  const decks = await env.DB.prepare(`
    SELECT * FROM user_decks WHERE username = ?
    ORDER BY updated_at DESC
  `).bind(params.username.toLowerCase()).all();
  
  return jsonResponse(decks.results);
});

// ============================================
// COLLECTION ROUTES (Cards user owns)
// ============================================

// Add card to collection
addRoute('POST', '/api/collection/add', async (request, env) => {
  const { username, scryfall_id, quantity } = await parseBody<{
    username: string;
    scryfall_id: string;
    quantity?: number;
  }>(request);

  if (!username || !scryfall_id) {
    return jsonResponse({ error: 'Username and scryfall_id are required' }, 400);
  }

  // Ensure card reference exists
  await env.DB.prepare(
    'INSERT OR IGNORE INTO cards (scryfall_id) VALUES (?)'
  ).bind(scryfall_id).run();

  // Add to user's collection (upsert)
  await env.DB.prepare(`
    INSERT INTO user_cards (scryfall_id, username, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT (scryfall_id, username) 
    DO UPDATE SET quantity = quantity + excluded.quantity
  `).bind(scryfall_id, username.toLowerCase(), quantity || 1).run();

  return jsonResponse({ scryfall_id, username, quantity: quantity || 1, added: true });
});

// Update card quantity in collection
addRoute('PUT', '/api/collection/update', async (request, env) => {
  const { username, scryfall_id, quantity } = await parseBody<{
    username: string;
    scryfall_id: string;
    quantity: number;
  }>(request);

  if (quantity <= 0) {
    // Remove from collection if quantity is 0 or negative
    await env.DB.prepare(
      'DELETE FROM user_cards WHERE scryfall_id = ? AND username = ?'
    ).bind(scryfall_id, username.toLowerCase()).run();
    return jsonResponse({ scryfall_id, removed: true });
  }

  await env.DB.prepare(
    'UPDATE user_cards SET quantity = ? WHERE scryfall_id = ? AND username = ?'
  ).bind(quantity, scryfall_id, username.toLowerCase()).run();

  return jsonResponse({ scryfall_id, quantity, updated: true });
});

// Remove card from collection
addRoute('DELETE', '/api/collection/:username/:scryfallId', async (_request, env, params) => {
  await env.DB.prepare(
    'DELETE FROM user_cards WHERE scryfall_id = ? AND username = ?'
  ).bind(params.scryfallId, params.username.toLowerCase()).run();

  return jsonResponse({ deleted: true });
});

// ============================================
// DECK ROUTES
// ============================================

// Create deck
addRoute('POST', '/api/decks', async (request, env) => {
  const { name, commander_id, format, description, owner_username } = await parseBody<{
    name: string;
    commander_id?: string;
    format?: string;
    description?: string;
    owner_username: string;
  }>(request);

  if (!name || !owner_username) {
    return jsonResponse({ error: 'Deck name and owner_username are required' }, 400);
  }

  // If commander specified, ensure card reference exists
  if (commander_id) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO cards (scryfall_id) VALUES (?)'
    ).bind(commander_id).run();
  }

  // Create deck
  const result = await env.DB.prepare(`
    INSERT INTO decks (name, commander_id, format, description)
    VALUES (?, ?, ?, ?)
  `).bind(
    name,
    commander_id || null,
    format || 'casual',
    description || null
  ).run();

  const deckId = result.meta.last_row_id;

  // Add owner
  await env.DB.prepare(`
    INSERT INTO deck_owners (deck_id, username, role)
    VALUES (?, ?, 'owner')
  `).bind(deckId, owner_username.toLowerCase()).run();

  return jsonResponse({ id: deckId, name, owner: owner_username.toLowerCase() }, 201);
});

// Get deck by ID (with card list as scryfall_ids). ?with_names=1 resolves names via Scryfall server-side.
addRoute('GET', '/api/decks/:id', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const url = new URL(request.url);
  const withNames = url.searchParams.get('with_names') === '1';

  const deck = await env.DB.prepare(`
    SELECT * FROM deck_summary WHERE id = ?
  `).bind(deckId).first();

  if (!deck) {
    return jsonResponse({ error: 'Deck not found' }, 404);
  }

  const cardsResult = await env.DB.prepare(`
    SELECT scryfall_id, quantity, is_sideboard, is_commander
    FROM deck_cards
    WHERE deck_id = ?
  `).bind(deckId).all();

  let cards = cardsResult.results as Array<{ scryfall_id: string; quantity: number; is_sideboard: number; is_commander: number }>;
  if (withNames && cards.length > 0) {
    const uniqueIds = [...new Set(cards.map((c) => c.scryfall_id))];
    const nameMap = await fetchCardNamesFromScryfall(uniqueIds);
    cards = cards.map((c) => {
      const info = nameMap.get(c.scryfall_id);
      return {
        ...c,
        name: info?.name ?? c.scryfall_id,
        mana_cost: info?.mana_cost ?? undefined,
      };
    });
  }

  const owners = await env.DB.prepare(`
    SELECT username, role FROM deck_owners WHERE deck_id = ?
  `).bind(deckId).all();

  return jsonResponse({
    ...deck,
    cards,
    owners: owners.results,
  });
});

// Update deck
addRoute('PUT', '/api/decks/:id', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const { name, commander_id, format, description } = await parseBody<{
    name?: string;
    commander_id?: string | null;
    format?: string;
    description?: string;
  }>(request);

  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (commander_id !== undefined) { 
    updates.push('commander_id = ?'); 
    values.push(commander_id);
    // Ensure card reference exists
    if (commander_id) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO cards (scryfall_id) VALUES (?)'
      ).bind(commander_id).run();
    }
  }
  if (format !== undefined) { updates.push('format = ?'); values.push(format); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  
  if (updates.length === 0) {
    return jsonResponse({ error: 'No updates provided' }, 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(deckId);

  await env.DB.prepare(`
    UPDATE decks SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();

  return jsonResponse({ id: deckId, updated: true });
});

// Delete deck
addRoute('DELETE', '/api/decks/:id', async (_request, env, params) => {
  const deckId = parseInt(params.id);
  
  await env.DB.prepare('DELETE FROM decks WHERE id = ?').bind(deckId).run();
  
  return jsonResponse({ deleted: true });
});

// Resolve deck list (card names -> scryfall_id + name) via Scryfall server-side. Use when client cannot reach Scryfall.
addRoute('POST', '/api/decks/resolve-list', async (request) => {
  const { cards } = await parseBody<{ cards: Array<{ quantity: number; name: string; set?: string }> }>(request);
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return jsonResponse({ error: 'cards array required' }, 400);
  }
  const resolved: Array<{ scryfall_id: string; name: string; quantity: number }> = [];
  const not_found: string[] = [];
  for (const item of cards) {
    const name = (item.name ?? '').trim();
    if (!name) continue;
    const card = await fetchCardByName(name, item.set);
    if (card) {
      resolved.push({ scryfall_id: card.id, name: card.name, quantity: Math.max(1, Number(item.quantity) || 1) });
    } else {
      not_found.push(name);
    }
  }
  return jsonResponse({ resolved, not_found });
});

// Add card to deck
addRoute('POST', '/api/decks/:id/cards', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const { scryfall_id, quantity, is_sideboard, is_commander } = await parseBody<{
    scryfall_id: string;
    quantity?: number;
    is_sideboard?: boolean;
    is_commander?: boolean;
  }>(request);

  if (!scryfall_id) {
    return jsonResponse({ error: 'scryfall_id is required' }, 400);
  }

  // Ensure card reference exists
  await env.DB.prepare(
    'INSERT OR IGNORE INTO cards (scryfall_id) VALUES (?)'
  ).bind(scryfall_id).run();

  try {
    await env.DB.prepare(`
      INSERT INTO deck_cards (deck_id, scryfall_id, quantity, is_sideboard, is_commander)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (deck_id, scryfall_id, is_sideboard) 
      DO UPDATE SET quantity = excluded.quantity, is_commander = excluded.is_commander
    `).bind(
      deckId,
      scryfall_id,
      quantity || 1,
      is_sideboard ? 1 : 0,
      is_commander ? 1 : 0
    ).run();

    // Update deck timestamp
    await env.DB.prepare(
      'UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(deckId).run();

    return jsonResponse({ deck_id: deckId, scryfall_id, added: true });
  } catch (e) {
    return jsonResponse({ error: 'Failed to add card to deck' }, 400);
  }
});

// Remove card from deck
addRoute('DELETE', '/api/decks/:id/cards/:scryfallId', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const url = new URL(request.url);
  const sideboard = url.searchParams.get('sideboard') === 'true' ? 1 : 0;

  await env.DB.prepare(`
    DELETE FROM deck_cards WHERE deck_id = ? AND scryfall_id = ? AND is_sideboard = ?
  `).bind(deckId, params.scryfallId, sideboard).run();

  // Update deck timestamp
  await env.DB.prepare(
    'UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(deckId).run();

  return jsonResponse({ deleted: true });
});

// Share deck with user
addRoute('POST', '/api/decks/:id/share', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const { username, role } = await parseBody<{ username: string; role?: string }>(request);

  // Check if user exists
  const user = await env.DB.prepare(
    'SELECT username FROM users WHERE username = ?'
  ).bind(username.toLowerCase()).first();

  if (!user) {
    return jsonResponse({ error: 'User not found' }, 404);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO deck_owners (deck_id, username, role)
      VALUES (?, ?, ?)
      ON CONFLICT (deck_id, username) DO UPDATE SET role = excluded.role
    `).bind(deckId, username.toLowerCase(), role || 'viewer').run();

    return jsonResponse({ deck_id: deckId, username: username.toLowerCase(), role: role || 'viewer', shared: true });
  } catch (e) {
    return jsonResponse({ error: 'Failed to share deck' }, 400);
  }
});

// ============================================
// REMOTE PLAY (SpellTable-style, low-bandwidth friendly)
// ============================================

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Create play session
addRoute('POST', '/api/play/sessions', async (request, env) => {
  const { host_username, game_type, settings } = await parseBody<{
    host_username: string;
    game_type?: string;
    settings?: string;
  }>(request);

  if (!host_username) {
    return jsonResponse({ error: 'host_username is required' }, 400);
  }

  const gameType = game_type || 'mtg';
  const startingLife = gameType === 'mtg' ? 40 : null;
  const settingsJson = settings || JSON.stringify(gameType === 'mtg' ? { starting_life: 40 } : {});

  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await env.DB.prepare(
      'SELECT id FROM play_sessions WHERE join_code = ?'
    ).bind(joinCode).first();
    if (!existing) break;
    joinCode = generateJoinCode();
  }

  const result = await env.DB.prepare(`
    INSERT INTO play_sessions (join_code, game_type, host_username, settings)
    VALUES (?, ?, ?, ?)
  `).bind(joinCode, gameType, host_username.toLowerCase(), settingsJson).run();

  const sessionId = result.meta.last_row_id as number;

  await env.DB.prepare(`
    INSERT INTO play_participants (session_id, username, seat_index, life_total)
    VALUES (?, ?, 0, ?)
  `).bind(sessionId, host_username.toLowerCase(), startingLife).run();

  return jsonResponse({
    id: sessionId,
    join_code: joinCode,
    game_type: gameType,
    host_username: host_username.toLowerCase(),
    settings: settingsJson,
    created: true,
  }, 201);
});

// Get session by join code (full state for polling)
addRoute('GET', '/api/play/sessions/:code', async (_request, env, params) => {
  const code = (params.code || '').toUpperCase();
  const session = await env.DB.prepare(
    'SELECT id, join_code, game_type, host_username, settings, created_at, updated_at FROM play_sessions WHERE join_code = ?'
  ).bind(code).first();

  if (!session) {
    return jsonResponse({ error: 'Session not found' }, 404);
  }

  const participants = await env.DB.prepare(`
    SELECT username, seat_index, life_total, joined_at
    FROM play_participants WHERE session_id = ?
    ORDER BY seat_index, joined_at
  `).bind((session as { id: number }).id).all();

  const url = new URL(_request.url);
  const sinceId = url.searchParams.get('since');
  let actions: D1Result;
  if (sinceId) {
    actions = await env.DB.prepare(`
      SELECT id, username, action_type, payload, created_at
      FROM play_actions WHERE session_id = ? AND id > ?
      ORDER BY id ASC LIMIT 100
    `).bind((session as { id: number }).id, parseInt(sinceId, 10)).all();
  } else {
    actions = await env.DB.prepare(`
      SELECT id, username, action_type, payload, created_at
      FROM play_actions WHERE session_id = ?
      ORDER BY id DESC LIMIT 50
    `).bind((session as { id: number }).id).all();
    (actions as { results: unknown[] }).results.reverse();
  }

  return jsonResponse({
    ...session,
    participants: participants.results,
    actions: actions.results,
  });
});

// Join session
addRoute('POST', '/api/play/sessions/:code/join', async (request, env, params) => {
  const code = (params.code || '').toUpperCase();
  const { username } = await parseBody<{ username: string }>(request);

  if (!username) {
    return jsonResponse({ error: 'username is required' }, 400);
  }

  const session = await env.DB.prepare(
    'SELECT id, game_type, settings FROM play_sessions WHERE join_code = ?'
  ).bind(code).first();

  if (!session) {
    return jsonResponse({ error: 'Session not found' }, 404);
  }

  const sid = (session as { id: number }).id;
  const gameType = (session as { game_type: string }).game_type;
  const settings = (session as { settings: string | null }).settings;
  let startingLife: number | null = null;
  if (gameType === 'mtg' && settings) {
    try {
      const s = JSON.parse(settings) as { starting_life?: number };
      startingLife = s.starting_life ?? 40;
    } catch {
      startingLife = 40;
    }
  }

  const existing = await env.DB.prepare(
    'SELECT username FROM play_participants WHERE session_id = ? AND username = ?'
  ).bind(sid, username.toLowerCase()).first();

  if (existing) {
    return jsonResponse({ session_id: sid, join_code: code, joined: true, already_in: true });
  }

  const maxSeat = await env.DB.prepare(
    'SELECT COALESCE(MAX(seat_index), -1) as mx FROM play_participants WHERE session_id = ?'
  ).bind(sid).first();
  const seatIndex = ((maxSeat as { mx: number })?.mx ?? -1) + 1;

  await env.DB.prepare(`
    INSERT INTO play_participants (session_id, username, seat_index, life_total)
    VALUES (?, ?, ?, ?)
  `).bind(sid, username.toLowerCase(), seatIndex, startingLife).run();

  await env.DB.prepare(
    'UPDATE play_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(sid).run();

  return jsonResponse({ session_id: sid, join_code: code, joined: true }, 201);
});

// Leave session
addRoute('POST', '/api/play/sessions/:code/leave', async (request, env, params) => {
  const code = (params.code || '').toUpperCase();
  const { username } = await parseBody<{ username: string }>(request);

  if (!username) {
    return jsonResponse({ error: 'username is required' }, 400);
  }

  const session = await env.DB.prepare(
    'SELECT id FROM play_sessions WHERE join_code = ?'
  ).bind(code).first();

  if (!session) {
    return jsonResponse({ error: 'Session not found' }, 404);
  }

  await env.DB.prepare(
    'DELETE FROM play_participants WHERE session_id = ? AND username = ?'
  ).bind((session as { id: number }).id, username.toLowerCase()).run();

  return jsonResponse({ left: true });
});

// Submit action (play card, set life, pass turn, chat, etc.)
addRoute('POST', '/api/play/sessions/:code/actions', async (request, env, params) => {
  const code = (params.code || '').toUpperCase();
  const { username, action_type, payload } = await parseBody<{
    username: string;
    action_type: string;
    payload?: string | Record<string, unknown>;
  }>(request);

  if (!username || !action_type) {
    return jsonResponse({ error: 'username and action_type are required' }, 400);
  }

  const session = await env.DB.prepare(
    'SELECT id FROM play_sessions WHERE join_code = ?'
  ).bind(code).first();

  if (!session) {
    return jsonResponse({ error: 'Session not found' }, 404);
  }

  const sid = (session as { id: number }).id;
  const participant = await env.DB.prepare(
    'SELECT username FROM play_participants WHERE session_id = ? AND username = ?'
  ).bind(sid, username.toLowerCase()).first();

  if (!participant) {
    return jsonResponse({ error: 'Not a participant in this session' }, 403);
  }

  const payloadStr = typeof payload === 'string' ? payload : (payload ? JSON.stringify(payload) : null);

  await env.DB.prepare(`
    INSERT INTO play_actions (session_id, username, action_type, payload)
    VALUES (?, ?, ?, ?)
  `).bind(sid, username.toLowerCase(), action_type, payloadStr).run();

  await env.DB.prepare(
    'UPDATE play_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(sid).run();

  return jsonResponse({ action_submitted: true });
});

// Update life total (MTG)
addRoute('PUT', '/api/play/sessions/:code/players/:username/life', async (request, env, params) => {
  const code = (params.code || '').toUpperCase();
  const usernameParam = params.username;
  const { life_total } = await parseBody<{ life_total: number }>(request);

  if (life_total == null || typeof life_total !== 'number') {
    return jsonResponse({ error: 'life_total is required' }, 400);
  }

  const session = await env.DB.prepare(
    'SELECT id FROM play_sessions WHERE join_code = ?'
  ).bind(code).first();

  if (!session) {
    return jsonResponse({ error: 'Session not found' }, 404);
  }

  const result = await env.DB.prepare(`
    UPDATE play_participants SET life_total = ? WHERE session_id = ? AND username = ?
  `).bind(life_total, (session as { id: number }).id, usernameParam).run();

  if (result.meta.changes === 0) {
    return jsonResponse({ error: 'Participant not found' }, 404);
  }

  return jsonResponse({ updated: true, life_total });
});

// ============================================
// MAIN HANDLER
// ============================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Find matching route
    for (const route of routes) {
      if (route.method !== request.method) continue;
      
      const match = path.match(route.pattern);
      if (match) {
        try {
          const params = match.groups || {};
          return await route.handler(request, env, params);
        } catch (e: unknown) {
          const error = e as Error;
          console.error('Route error:', error);
          return jsonResponse({ error: error.message || 'Internal server error' }, 500);
        }
      }
    }

    // Health check
    if (path === '/api/health') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
