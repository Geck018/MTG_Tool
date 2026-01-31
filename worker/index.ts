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

// Get deck by ID (with card list as scryfall_ids)
addRoute('GET', '/api/decks/:id', async (_request, env, params) => {
  const deckId = parseInt(params.id);
  
  const deck = await env.DB.prepare(`
    SELECT * FROM deck_summary WHERE id = ?
  `).bind(deckId).first();
  
  if (!deck) {
    return jsonResponse({ error: 'Deck not found' }, 404);
  }

  // Get deck cards (just scryfall_ids and metadata)
  const cards = await env.DB.prepare(`
    SELECT scryfall_id, quantity, is_sideboard, is_commander
    FROM deck_cards
    WHERE deck_id = ?
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
