/**
 * MTG Deck Builder API Worker
 * Handles all database operations via Cloudflare D1
 * Cards are stored as references (scryfall_id only) - details fetched from Scryfall API
 */

export interface Env {
  DB: D1Database;
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<{ response?: string }>;
  };
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
const SCRYFALL_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  // Required by Scryfall API policy
  'User-Agent': 'TabletopTools-MTGDeckBuilder/1.0 (https://tabletoptools.cc)',
};
/** Max fallback lookups per request. Each can be 2 subrequests; 2 chunks = 2 collection calls. Stay under Worker limit (~50). */
const MAX_FALLBACK_PER_REQUEST = 12;

interface ScryfallCardSnapshot {
  id: string;
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  keywords?: string[];
}

/** Resolve a card by name (and optional set) via Scryfall. Max 2 subrequests (exact then fuzzy) to conserve limit. */
async function fetchCardByName(name: string, set?: string): Promise<{ id: string; name: string } | null> {
  const isSetCode = set && /^[a-zA-Z0-9]{2,5}$/.test(set);
  let url = `${SCRYFALL_BASE}/cards/named?exact=${encodeURIComponent(name)}`;
  if (isSetCode) url += `&set=${encodeURIComponent(set.toLowerCase())}`;
  let res = await fetch(url, { headers: SCRYFALL_HEADERS });
  if (!res.ok) {
    url = `${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`;
    res = await fetch(url, { headers: SCRYFALL_HEADERS });
  }
  if (!res.ok) return null;
  const card = (await res.json()) as { id: string; name: string };
  return { id: card.id, name: card.name };
}

async function ensureImportedDeckCardsTable(env: Env): Promise<void> {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS imported_deck_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL,
      raw_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      is_sideboard INTEGER DEFAULT 0,
      matched_scryfall_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
      FOREIGN KEY (matched_scryfall_id) REFERENCES cards(scryfall_id) ON DELETE SET NULL
    )
  `).run();
}

/** Resolve many cards by name/set. Uses collection API first, then exact/fuzzy named API for up to MAX_FALLBACK_PER_REQUEST not found (to stay under Worker subrequest limit). */
async function fetchCardsByNamesBatch(
  items: Array<{ name: string; set?: string; quantity?: number }>
): Promise<{ resolved: Array<{ id: string; name: string; quantity: number }>; not_found: string[] }> {
  const resolved: Array<{ id: string; name: string; quantity: number }> = [];
  const not_found: string[] = [];
  let fallbacksUsed = 0;
  for (let i = 0; i < items.length; i += SCRYFALL_BATCH_SIZE) {
    const chunk = items.slice(i, i + SCRYFALL_BATCH_SIZE);
    const identifiers = chunk.map((item) => {
      const name = (item.name ?? '').trim();
      const set = item.set && /^[a-zA-Z0-9]{2,5}$/.test(item.set) ? item.set.toLowerCase() : undefined;
      return set ? { name, set } : { name };
    });
    const body = JSON.stringify({ identifiers });
    const res = await fetch(SCRYFALL_COLLECTION, {
      method: 'POST',
      headers: SCRYFALL_HEADERS,
      body,
    });

    let data: Array<{ id: string; name: string }> = [];
    let nf: Array<{ name?: string; set?: string }> = [];
    if (res.ok) {
      const json = (await res.json()) as {
        data?: Array<{ id: string; name: string }>;
        not_found?: Array<{ name?: string; set?: string }>;
      };
      data = json.data ?? [];
      nf = json.not_found ?? [];
    }
    // When collection API fails (rate limit, 5xx) or returns all not_found, resolve each card via named API
    const fallbackItems: Array<{ name: string; set?: string; quantity: number }> = [];
    let dataIdx = 0;
    for (let j = 0; j < chunk.length; j++) {
      const item = chunk[j];
      const qty = Math.max(1, Number(item.quantity) || 1);
      const name = (item.name ?? '').trim();
      if (!name) continue;
      if (!res.ok) {
        fallbackItems.push({ name, set: item.set, quantity: qty });
        continue;
      }
      const inNf = nf.some(
        (n) => (n.name ?? '') === name && (n.set || '') === (item.set?.toLowerCase() || '')
      );
      if (inNf) {
        fallbackItems.push({ name, set: item.set, quantity: qty });
      } else {
        const card = data[dataIdx++];
        if (card) resolved.push({ id: card.id, name: card.name, quantity: qty });
        else fallbackItems.push({ name, set: item.set, quantity: qty });
      }
    }
    for (const item of fallbackItems) {
      if (fallbacksUsed >= MAX_FALLBACK_PER_REQUEST) {
        not_found.push(item.name);
        continue;
      }
      fallbacksUsed++;
      const card = await fetchCardByName(item.name, item.set);
      if (card) {
        resolved.push({ id: card.id, name: card.name, quantity: item.quantity });
      } else {
        not_found.push(item.name);
      }
    }
  }
  return { resolved, not_found };
}

/** Fetch card name (and mana_cost) for scryfall_ids from Scryfall API. Server-side only. */
async function fetchCardNamesFromScryfall(scryfallIds: string[]): Promise<Map<string, { name: string; mana_cost?: string }>> {
  const map = new Map<string, { name: string; mana_cost?: string }>();
  for (let i = 0; i < scryfallIds.length; i += SCRYFALL_BATCH_SIZE) {
    const batch = scryfallIds.slice(i, i + SCRYFALL_BATCH_SIZE);
    const body = JSON.stringify({ identifiers: batch.map((id) => ({ id })) });
    const res = await fetch(SCRYFALL_COLLECTION, {
      method: 'POST',
      headers: SCRYFALL_HEADERS,
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

function extractCardNameCandidates(query: string): string[] {
  const candidates: string[] = [];
  const patterns = [
    /attack(?:ing)?(?: with)?\s+(.+?)(?:,| and | then | but | blocked| block|$)/i,
    /blocks?(?: with)?\s+(.+?)(?:,| and | then | but |$)/i,
    /blocked(?: by)?\s+(.+?)(?:,| and | then | but |$)/i,
    /cast(?:ing)?\s+(.+?)(?:,| and | then | but |$)/i,
    /play(?:ing)?\s+(.+?)(?:,| and | then | but |$)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (!match?.[1]) continue;

    const cleaned = match[1]
      .replace(/\b(a|an|the|my|their|opponent'?s)\b/gi, ' ')
      .replace(/[.?!]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length >= 3 && cleaned.length <= 60) {
      candidates.push(cleaned);
    }
  }

  return [...new Set(candidates)].slice(0, 3);
}

async function fetchCardSnapshotByName(name: string): Promise<ScryfallCardSnapshot | null> {
  const exactUrl = `${SCRYFALL_BASE}/cards/named?exact=${encodeURIComponent(name)}`;
  let res = await fetch(exactUrl);

  if (!res.ok) {
    const fuzzyUrl = `${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`;
    res = await fetch(fuzzyUrl);
  }

  if (!res.ok) return null;

  const card = (await res.json()) as ScryfallCardSnapshot;
  return {
    id: card.id,
    name: card.name,
    mana_cost: card.mana_cost,
    type_line: card.type_line,
    oracle_text: card.oracle_text,
    power: card.power,
    toughness: card.toughness,
    keywords: card.keywords || [],
  };
}

async function getRulesAIResponse(
  env: Env,
  query: string,
  gameSystem: string,
  cardSnapshots: ScryfallCardSnapshot[]
): Promise<string> {
  if (!env.AI) {
    throw new Error('Workers AI binding is not configured');
  }

  const systemPrompt = `You are an MTG rules assistant.
Explain what happens in plain language with correct MTG rules logic.
Prefer this response format:
1) In this situation
2) What happens
3) Why (rule interaction)
If info is missing, ask one short clarifying question.
Do not invent card text you are unsure about.`;

  const cardContext = cardSnapshots.length > 0
    ? cardSnapshots
        .map(
          (card, index) =>
            `${index + 1}) ${card.name}
- Mana Cost: ${card.mana_cost || 'N/A'}
- Type: ${card.type_line || 'N/A'}
- P/T: ${card.power && card.toughness ? `${card.power}/${card.toughness}` : 'N/A'}
- Keywords: ${(card.keywords || []).join(', ') || 'None listed'}
- Oracle: ${card.oracle_text || 'N/A'}`
        )
        .join('\n')
    : 'No explicit card data found from Scryfall.';

  const userPrompt = `Game: ${gameSystem}
Question: ${query}

Scryfall card context:
${cardContext}`;

  const aiResult = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 350,
  });

  const answer = aiResult?.response?.trim();
  if (!answer) {
    throw new Error('Workers AI returned an empty response');
  }

  return answer;
}

// ============================================
// RULES CHAT ROUTES (Workers AI)
// ============================================
addRoute('POST', '/api/rules/chat', async (request, env) => {
  const { query, gameSystem } = await parseBody<{ query?: string; gameSystem?: string }>(request);
  const cleanQuery = (query || '').trim();
  const system = (gameSystem || 'mtg').toLowerCase();

  if (!cleanQuery) {
    return jsonResponse({ error: 'query is required' }, 400);
  }

  if (system !== 'mtg') {
    return jsonResponse({
      response: 'I currently support MTG rules best. Please ask an MTG scenario for now.',
      used_ai: false,
      fallback: true,
    });
  }

  try {
    const cardCandidates = extractCardNameCandidates(cleanQuery);
    const cardSnapshotsRaw = await Promise.all(cardCandidates.map(fetchCardSnapshotByName));
    const cardSnapshots = cardSnapshotsRaw.filter((card): card is ScryfallCardSnapshot => card !== null);

    const response = await getRulesAIResponse(env, cleanQuery, system, cardSnapshots);
    return jsonResponse({ response, used_ai: true, fallback: false, cards: cardSnapshots });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI error';
    return jsonResponse({
      response: 'I had trouble generating an AI ruling right now. Falling back to local rules logic.',
      used_ai: false,
      fallback: true,
      error: message,
    });
  }
});

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

// Create deck from raw names only (no immediate Scryfall resolution).
addRoute('POST', '/api/decks/import-raw', async (request, env) => {
  const { name, owner_username, format, cards } = await parseBody<{
    name: string;
    owner_username: string;
    format?: string;
    cards: Array<{ name: string; quantity?: number; is_sideboard?: boolean }>;
  }>(request);
  if (!name || !owner_username || !Array.isArray(cards) || cards.length === 0) {
    return jsonResponse({ error: 'name, owner_username, and cards are required' }, 400);
  }

  await ensureImportedDeckCardsTable(env);

  const deckResult = await env.DB.prepare(`
    INSERT INTO decks (name, format, description)
    VALUES (?, ?, ?)
  `).bind(name, format || 'casual', 'Raw imported deck').run();
  const deckId = deckResult.meta.last_row_id as number;

  await env.DB.prepare(`
    INSERT INTO deck_owners (deck_id, username, role)
    VALUES (?, ?, 'owner')
  `).bind(deckId, owner_username.toLowerCase()).run();

  const insertStmt = env.DB.prepare(`
    INSERT INTO imported_deck_cards (deck_id, raw_name, quantity, is_sideboard, matched_scryfall_id)
    VALUES (?, ?, ?, ?, NULL)
  `);
  for (const c of cards) {
    const rawName = String(c.name ?? '').trim();
    if (!rawName) continue;
    const qty = Math.max(1, Number(c.quantity) || 1);
    await insertStmt.bind(deckId, rawName, qty, c.is_sideboard ? 1 : 0).run();
  }

  return jsonResponse({ id: deckId, created: true }, 201);
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

// Get unmatched imported cards for a user.
addRoute('GET', '/api/users/:username/unmatched-cards', async (_request, env, params) => {
  await ensureImportedDeckCardsTable(env);
  const username = (params.username || '').toLowerCase();
  const rows = await env.DB.prepare(`
    SELECT
      ic.id,
      ic.deck_id,
      d.name AS deck_name,
      ic.raw_name,
      ic.quantity,
      ic.is_sideboard
    FROM imported_deck_cards ic
    JOIN deck_owners o ON o.deck_id = ic.deck_id
    JOIN decks d ON d.id = ic.deck_id
    WHERE o.username = ? AND ic.matched_scryfall_id IS NULL
    ORDER BY d.updated_at DESC, ic.id ASC
  `).bind(username).all();
  return jsonResponse(rows.results ?? []);
});

// Resolve one imported raw card into a real deck card.
addRoute('POST', '/api/imported-cards/:id/resolve', async (request, env, params) => {
  await ensureImportedDeckCardsTable(env);
  const importedId = parseInt(params.id, 10);
  const { scryfall_id } = await parseBody<{ scryfall_id: string }>(request);
  if (!importedId || !scryfall_id) return jsonResponse({ error: 'id and scryfall_id required' }, 400);

  const row = await env.DB.prepare(`
    SELECT id, deck_id, quantity, is_sideboard
    FROM imported_deck_cards
    WHERE id = ? AND matched_scryfall_id IS NULL
  `).bind(importedId).first<{ id: number; deck_id: number; quantity: number; is_sideboard: number }>();
  if (!row) return jsonResponse({ error: 'Imported card not found or already resolved' }, 404);

  await env.DB.prepare('INSERT OR IGNORE INTO cards (scryfall_id) VALUES (?)').bind(scryfall_id).run();
  await env.DB.prepare(`
    INSERT INTO deck_cards (deck_id, scryfall_id, quantity, is_sideboard, is_commander)
    VALUES (?, ?, ?, ?, 0)
    ON CONFLICT (deck_id, scryfall_id, is_sideboard)
    DO UPDATE SET quantity = deck_cards.quantity + excluded.quantity
  `).bind(row.deck_id, scryfall_id, row.quantity || 1, row.is_sideboard ? 1 : 0).run();

  await env.DB.prepare(`
    UPDATE imported_deck_cards
    SET matched_scryfall_id = ?
    WHERE id = ?
  `).bind(scryfall_id, importedId).run();

  await env.DB.prepare('UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(row.deck_id).run();
  return jsonResponse({ resolved: true, imported_id: importedId, deck_id: row.deck_id });
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

// Resolve deck list (card names -> scryfall_id + name) via Scryfall server-side. Batched to avoid subrequest limit.
addRoute('POST', '/api/decks/resolve-list', async (request) => {
  let body: { cards?: unknown };
  try {
    body = await parseBody<{ cards?: unknown }>(request);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  const cards = body.cards;
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return jsonResponse({ error: 'Request must include a non-empty "cards" array' }, 400);
  }
  const items = cards
    .filter((item: unknown) => item && typeof item === 'object' && (item as { name?: unknown }).name != null)
    .map((item: unknown) => {
      const o = item as { name: string; set?: string; quantity?: number };
      return {
        name: String(o.name ?? '').trim(),
        set: o.set != null ? String(o.set).trim() || undefined : undefined,
        quantity: typeof o.quantity === 'number' && o.quantity > 0 ? o.quantity : 1,
      };
    })
    .filter((item) => item.name.length > 0);
  if (items.length === 0) {
    return jsonResponse({ error: 'No valid card names in "cards" array' }, 400);
  }
  const { resolved: batchResolved, not_found } = await fetchCardsByNamesBatch(items);
  const resolved = batchResolved.map((r) => ({ scryfall_id: r.id, name: r.name, quantity: r.quantity }));
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
