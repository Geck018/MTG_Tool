/**
 * MTG Deck Builder API Worker
 * Handles all database operations via Cloudflare D1
 */

export interface Env {
  DB: D1Database;
}

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
// USER ROUTES
// ============================================

// Create user
addRoute('POST', '/api/users', async (request, env) => {
  const { username } = await parseBody<{ username: string }>(request);
  
  if (!username || username.length < 3) {
    return jsonResponse({ error: 'Username must be at least 3 characters' }, 400);
  }

  try {
    await env.DB.prepare('INSERT INTO users (username) VALUES (?)').bind(username).run();
    return jsonResponse({ username, created: true }, 201);
  } catch (e: unknown) {
    const error = e as Error;
    if (error.message?.includes('UNIQUE constraint')) {
      return jsonResponse({ error: 'Username already exists' }, 409);
    }
    throw e;
  }
});

// Get user
addRoute('GET', '/api/users/:username', async (_request, env, params) => {
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(params.username)
    .first();
  
  if (!user) {
    return jsonResponse({ error: 'User not found' }, 404);
  }
  
  return jsonResponse(user);
});

// Get user's collection
addRoute('GET', '/api/users/:username/collection', async (_request, env, params) => {
  const cards = await env.DB.prepare(`
    SELECT * FROM user_collection WHERE username = ?
  `).bind(params.username).all();
  
  return jsonResponse(cards.results);
});

// Get user's decks
addRoute('GET', '/api/users/:username/decks', async (_request, env, params) => {
  const decks = await env.DB.prepare(`
    SELECT * FROM user_decks WHERE username = ?
  `).bind(params.username).all();
  
  return jsonResponse(decks.results);
});

// ============================================
// CARD ROUTES
// ============================================

// Create card (add to database)
addRoute('POST', '/api/cards', async (request, env) => {
  const { scryfall_id, name, mana_value, power, toughness, card_type, image_url } = 
    await parseBody<{
      scryfall_id?: string;
      name: string;
      mana_value?: number;
      power?: string;
      toughness?: string;
      card_type?: string;
      image_url?: string;
    }>(request);

  if (!name) {
    return jsonResponse({ error: 'Card name is required' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO cards (scryfall_id, name, mana_value, power, toughness, card_type, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    scryfall_id || null,
    name,
    mana_value || 0,
    power || null,
    toughness || null,
    card_type || null,
    image_url || null
  ).run();

  return jsonResponse({ id: result.meta.last_row_id, name }, 201);
});

// Get card by ID
addRoute('GET', '/api/cards/:id', async (_request, env, params) => {
  const card = await env.DB.prepare('SELECT * FROM cards WHERE id = ?')
    .bind(parseInt(params.id))
    .first();
  
  if (!card) {
    return jsonResponse({ error: 'Card not found' }, 404);
  }
  
  return jsonResponse(card);
});

// Search cards by name
addRoute('GET', '/api/cards', async (request, env) => {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const cards = await env.DB.prepare(`
    SELECT * FROM cards WHERE name LIKE ? LIMIT ?
  `).bind(`%${search}%`, limit).all();

  return jsonResponse(cards.results);
});

// Add card to user's collection
addRoute('POST', '/api/cards/:id/owners', async (request, env, params) => {
  const { username, quantity } = await parseBody<{ username: string; quantity?: number }>(request);
  const cardId = parseInt(params.id);

  try {
    await env.DB.prepare(`
      INSERT INTO card_owners (card_id, username, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT (card_id, username) DO UPDATE SET quantity = quantity + excluded.quantity
    `).bind(cardId, username, quantity || 1).run();

    return jsonResponse({ card_id: cardId, username, added: true });
  } catch (e) {
    return jsonResponse({ error: 'Failed to add card to collection' }, 400);
  }
});

// Remove card from user's collection
addRoute('DELETE', '/api/cards/:id/owners/:username', async (_request, env, params) => {
  const cardId = parseInt(params.id);
  
  await env.DB.prepare(`
    DELETE FROM card_owners WHERE card_id = ? AND username = ?
  `).bind(cardId, params.username).run();

  return jsonResponse({ deleted: true });
});

// ============================================
// DECK ROUTES
// ============================================

// Create deck
addRoute('POST', '/api/decks', async (request, env) => {
  const { name, commander_card_id, format, description, owner_username } = 
    await parseBody<{
      name: string;
      commander_card_id?: number;
      format?: string;
      description?: string;
      owner_username: string;
    }>(request);

  if (!name || !owner_username) {
    return jsonResponse({ error: 'Deck name and owner username are required' }, 400);
  }

  // Create deck
  const result = await env.DB.prepare(`
    INSERT INTO decks (name, commander_card_id, format, description)
    VALUES (?, ?, ?, ?)
  `).bind(
    name,
    commander_card_id || null,
    format || 'casual',
    description || null
  ).run();

  const deckId = result.meta.last_row_id;

  // Add owner
  await env.DB.prepare(`
    INSERT INTO deck_owners (deck_id, username, role)
    VALUES (?, ?, 'owner')
  `).bind(deckId, owner_username).run();

  return jsonResponse({ id: deckId, name, owner: owner_username }, 201);
});

// Get deck by ID
addRoute('GET', '/api/decks/:id', async (_request, env, params) => {
  const deckId = parseInt(params.id);
  
  const deck = await env.DB.prepare(`
    SELECT * FROM deck_summary WHERE id = ?
  `).bind(deckId).first();
  
  if (!deck) {
    return jsonResponse({ error: 'Deck not found' }, 404);
  }

  // Get deck cards
  const cards = await env.DB.prepare(`
    SELECT c.*, dc.quantity, dc.is_sideboard, dc.is_commander
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = ?
  `).bind(deckId).all();

  // Get deck owners
  const owners = await env.DB.prepare(`
    SELECT username, role FROM deck_owners WHERE deck_id = ?
  `).bind(deckId).all();

  return jsonResponse({
    ...deck,
    cards: cards.results,
    owners: owners.results,
  });
});

// Update deck
addRoute('PUT', '/api/decks/:id', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const { name, commander_card_id, format, description } = 
    await parseBody<{
      name?: string;
      commander_card_id?: number | null;
      format?: string;
      description?: string;
    }>(request);

  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (commander_card_id !== undefined) { updates.push('commander_card_id = ?'); values.push(commander_card_id); }
  if (format !== undefined) { updates.push('format = ?'); values.push(format); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  
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

// Add card to deck
addRoute('POST', '/api/decks/:id/cards', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const { card_id, quantity, is_sideboard, is_commander } = 
    await parseBody<{
      card_id: number;
      quantity?: number;
      is_sideboard?: boolean;
      is_commander?: boolean;
    }>(request);

  try {
    await env.DB.prepare(`
      INSERT INTO deck_cards (deck_id, card_id, quantity, is_sideboard, is_commander)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (deck_id, card_id, is_sideboard) DO UPDATE SET quantity = excluded.quantity
    `).bind(
      deckId,
      card_id,
      quantity || 1,
      is_sideboard ? 1 : 0,
      is_commander ? 1 : 0
    ).run();

    // Update deck timestamp
    await env.DB.prepare('UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(deckId).run();

    return jsonResponse({ deck_id: deckId, card_id, added: true });
  } catch (e) {
    return jsonResponse({ error: 'Failed to add card to deck' }, 400);
  }
});

// Remove card from deck
addRoute('DELETE', '/api/decks/:id/cards/:cardId', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const cardId = parseInt(params.cardId);
  const url = new URL(request.url);
  const sideboard = url.searchParams.get('sideboard') === 'true' ? 1 : 0;

  await env.DB.prepare(`
    DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ? AND is_sideboard = ?
  `).bind(deckId, cardId, sideboard).run();

  // Update deck timestamp
  await env.DB.prepare('UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(deckId).run();

  return jsonResponse({ deleted: true });
});

// Share deck with user
addRoute('POST', '/api/decks/:id/share', async (request, env, params) => {
  const deckId = parseInt(params.id);
  const { username, role } = await parseBody<{ username: string; role?: string }>(request);

  try {
    await env.DB.prepare(`
      INSERT INTO deck_owners (deck_id, username, role)
      VALUES (?, ?, ?)
      ON CONFLICT (deck_id, username) DO UPDATE SET role = excluded.role
    `).bind(deckId, username, role || 'viewer').run();

    return jsonResponse({ deck_id: deckId, username, role: role || 'viewer', shared: true });
  } catch (e) {
    return jsonResponse({ error: 'Failed to share deck' }, 400);
  }
});

// ============================================
// MAIN HANDLER
// ============================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
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
