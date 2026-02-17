/**
 * Remote Play (SpellTable-style) — play MTG remotely with your own equipment.
 * Works on very slow connections: no video, just sync game actions (play card, life, etc.).
 * Game-agnostic data model so we can add Warhammer/other games later.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { playApi, userApi, deckApi, type PlaySessionState, type PlayAction, type PlayParticipant, type DeckCardRef } from '../services/api';

const POLL_INTERVAL_MS = 5000;
const GAME_TYPE_LABEL: Record<string, string> = { mtg: 'Magic: The Gathering' };

interface RemotePlayAppProps {
  onBack: () => void;
}

type View = 'landing' | 'table';

export function RemotePlayApp({ onBack }: RemotePlayAppProps) {
  const { user } = useAuth();
  const username = user?.username ?? '';

  const [view, setView] = useState<View>('landing');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [session, setSession] = useState<PlaySessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastActionId, setLastActionId] = useState<number>(0);

  // Poll session state when at the table
  const refreshSession = useCallback(async (code: string, sinceId?: number) => {
    if (!code) return;
    try {
      const data = await playApi.getSession(code.toUpperCase(), sinceId);
      setSession(data);
      if (data.actions.length > 0) {
        const maxId = Math.max(...data.actions.map((a) => a.id));
        setLastActionId(maxId);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (view !== 'table' || !session?.join_code) return;
    const code = session.join_code;
    const interval = setInterval(() => refreshSession(code, lastActionId || undefined), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [view, session?.join_code, lastActionId, refreshSession]);

  const handleCreateTable = async () => {
    setError(null);
    setLoading(true);
    try {
      const created = await playApi.createSession(username, 'mtg');
      await playApi.joinSession(created.join_code, username);
      await refreshSession(created.join_code);
      setSession({
        ...created,
        participants: [{ username: created.host_username, seat_index: 0, life_total: 40, joined_at: new Date().toISOString() }],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: created.settings,
      });
      setView('table');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTable = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setError('Enter a join code');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await playApi.joinSession(code, username);
      await refreshSession(code);
      setView('table');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTable = async () => {
    if (!session?.join_code) return;
    try {
      await playApi.leaveSession(session.join_code, username);
      setSession(null);
      setView('landing');
      setJoinCodeInput('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!username) {
    return (
      <div className="remote-play-app">
        <p>Please log in to use Remote Play.</p>
      </div>
    );
  }

  return (
    <div className="remote-play-app">
      <header className="app-header remote-play-header">
        <div className="header-left">
          <button type="button" className="back-button" onClick={onBack}>
            ← Back to Games
          </button>
          <h1>🖥️ Remote Play</h1>
        </div>
      </header>

      {view === 'landing' && (
        <div className="remote-play-landing">
          <p className="remote-play-intro">
            Play Magic remotely using your own cards. No video required — works on slow connections.
            Share a code with friends; everyone logs plays by naming the card they played.
          </p>
          {error && <div className="remote-play-error">{error}</div>}
          <div className="remote-play-actions">
            <button
              type="button"
              className="remote-play-btn primary"
              onClick={handleCreateTable}
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create a table'}
            </button>
            <div className="remote-play-join">
              <input
                type="text"
                placeholder="Join code (e.g. ABC12)"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 5))}
                maxLength={5}
                className="remote-play-code-input"
              />
              <button
                type="button"
                className="remote-play-btn"
                onClick={handleJoinTable}
                disabled={loading}
              >
                Join table
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'table' && session && (
        <RemotePlayTable
          session={session}
          username={username}
          onRefresh={() => refreshSession(session.join_code, lastActionId || undefined)}
          onLeave={handleLeaveTable}
          onError={setError}
        />
      )}
    </div>
  );
}

interface RemotePlayTableProps {
  session: PlaySessionState;
  username: string;
  onRefresh: () => Promise<void>;
  onLeave: () => void;
  onError: (msg: string | null) => void;
}

function RemotePlayTable({ session, username, onRefresh, onLeave, onError }: RemotePlayTableProps) {
  const [userDecks, setUserDecks] = useState<{ id: number; name: string }[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [deckCards, setDeckCards] = useState<DeckCardRef[]>([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const [cardFilter, setCardFilter] = useState('');
  const [selectedCard, setSelectedCard] = useState<{ id: string; name: string } | null>(null);
  const [lifeEdit, setLifeEdit] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const gameType = session.game_type || 'mtg';
  const gameLabel = GAME_TYPE_LABEL[gameType] || gameType;

  // Load user's decks when at table
  useEffect(() => {
    if (!username) return;
    userApi.getDecks(username).then((decks) => {
      setUserDecks(decks.map((d) => ({ id: d.deck_id, name: d.deck_name })));
    }).catch(() => setUserDecks([]));
  }, [username]);

  // When user selects a deck, load its cards with names (server-side Scryfall)
  useEffect(() => {
    if (selectedDeckId == null) {
      setDeckCards([]);
      return;
    }
    setDeckLoading(true);
    deckApi.get(selectedDeckId, true)
      .then((deck) => {
        const main = (deck.cards ?? []).filter((c) => !c.is_sideboard);
        setDeckCards(main);
      })
      .catch(() => setDeckCards([]))
      .finally(() => setDeckLoading(false));
  }, [selectedDeckId]);

  const mainDeckCards = deckCards.filter((c) => {
    const name = (c.name ?? c.scryfall_id).toLowerCase();
    return !cardFilter.trim() || name.includes(cardFilter.trim().toLowerCase());
  });

  const handlePlayCard = async (card: { id: string; name: string }) => {
    if (!session.join_code || submitting) return;
    setSubmitting(true);
    onError(null);
    try {
      await playApi.submitAction(session.join_code, username, 'play_card', { scryfall_id: card.id, card_name: card.name });
      setSelectedCard(null);
      await onRefresh();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetLife = async (participantUsername: string, value: string) => {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0 || n > 999) return;
    onError(null);
    try {
      await playApi.setLife(session.join_code, participantUsername, n);
      setLifeEdit((prev) => ({ ...prev, [participantUsername]: '' }));
      await onRefresh();
    } catch (e) {
      onError((e as Error).message);
    }
  };

  const handlePassTurn = async () => {
    onError(null);
    try {
      await playApi.submitAction(session.join_code, username, 'pass_turn');
      await onRefresh();
    } catch (e) {
      onError((e as Error).message);
    }
  };

  return (
    <div className="remote-play-table">
      <div className="remote-play-table-meta">
        <span className="remote-play-game-type">{gameLabel}</span>
        <span className="remote-play-code">Code: <strong>{session.join_code}</strong></span>
        <button type="button" className="remote-play-copy-btn" onClick={() => {
          navigator.clipboard.writeText(session.join_code);
        }}>
          Copy code
        </button>
        <button type="button" className="remote-play-copy-btn" onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/play`);
        }}>
          Copy app link
        </button>
      </div>

      <section className="remote-play-players">
        <h3>Players</h3>
        <div className="remote-play-players-list">
          {session.participants.map((p) => (
            <PlayerRow
              key={p.username}
              participant={p}
              isSelf={p.username === username}
              gameType={gameType}
              lifeEdit={lifeEdit[p.username]}
              onLifeEditChange={(v) => setLifeEdit((prev) => ({ ...prev, [p.username]: v }))}
              onSetLife={(v) => handleSetLife(p.username, v)}
            />
          ))}
        </div>
      </section>

      {gameType === 'mtg' && (
        <section className="remote-play-play-card">
          <h3>Play a card from your deck</h3>
          <div className="remote-play-deck-select">
            <label htmlFor="remote-play-deck">Your deck:</label>
            <select
              id="remote-play-deck"
              value={selectedDeckId ?? ''}
              onChange={(e) => setSelectedDeckId(e.target.value ? Number(e.target.value) : null)}
              className="remote-play-deck-select-input"
            >
              <option value="">Select a deck…</option>
              {userDecks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {deckLoading && <span className="remote-play-search-status">Loading deck…</span>}
          </div>
          {deckCards.length > 0 && (
            <>
              <input
                type="text"
                placeholder="Filter by name…"
                value={cardFilter}
                onChange={(e) => { setCardFilter(e.target.value); setSelectedCard(null); }}
                className="remote-play-card-input"
              />
              {mainDeckCards.length > 0 ? (
                <ul className="remote-play-card-results">
                  {mainDeckCards.map((c) => {
                    const card = { id: c.scryfall_id, name: c.name ?? c.scryfall_id };
                    return (
                      <li key={c.scryfall_id}>
                        <button
                          type="button"
                          className={selectedCard?.id === card.id ? 'selected' : ''}
                          onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                        >
                          {card.name}
                          {c.quantity > 1 && <span className="remote-play-card-qty"> ×{c.quantity}</span>}
                          {c.mana_cost && <span className="mana-cost">{c.mana_cost}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="remote-play-no-cards">No matching cards.</p>
              )}
            </>
          )}
          {selectedCard && (
            <div className="remote-play-selected-action">
              <span>Playing: <strong>{selectedCard.name}</strong></span>
              <button
                type="button"
                className="remote-play-btn primary small"
                onClick={() => handlePlayCard(selectedCard)}
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Confirm play'}
              </button>
            </div>
          )}
          <button type="button" className="remote-play-btn secondary" onClick={handlePassTurn}>
            Pass turn
          </button>
        </section>
      )}

      <section className="remote-play-log">
        <h3>Game log</h3>
        <div className="remote-play-log-inner">
          {session.actions.length === 0 ? (
            <p className="remote-play-log-empty">No actions yet.</p>
          ) : (
            session.actions.map((action) => (
              <ActionLine key={action.id} action={action} />
            ))
          )}
        </div>
      </section>

      <div className="remote-play-table-footer">
        <button type="button" className="remote-play-btn leave" onClick={onLeave}>
          Leave table
        </button>
      </div>
    </div>
  );
}

function PlayerRow({
  participant,
  isSelf,
  gameType,
  lifeEdit,
  onLifeEditChange,
  onSetLife,
}: {
  participant: PlayParticipant;
  isSelf: boolean;
  gameType: string;
  lifeEdit: string;
  onLifeEditChange: (v: string) => void;
  onSetLife: (v: string) => void;
}) {
  const [editingLife, setEditingLife] = useState(false);
  const life = participant.life_total;

  if (gameType !== 'mtg') {
    return (
      <div className={`remote-play-player ${isSelf ? 'self' : ''}`}>
        <span className="player-name">{participant.username}{isSelf ? ' (you)' : ''}</span>
      </div>
    );
  }

  return (
    <div className={`remote-play-player ${isSelf ? 'self' : ''}`}>
      <span className="player-name">{participant.username}{isSelf ? ' (you)' : ''}</span>
      <div className="player-life">
        {editingLife ? (
          <>
            <input
              type="number"
              min={0}
              max={999}
              value={lifeEdit}
              onChange={(e) => onLifeEditChange(e.target.value)}
              className="remote-play-life-input"
            />
            <button type="button" className="remote-play-btn small" onClick={() => { onSetLife(lifeEdit); setEditingLife(false); }}>
              Set
            </button>
            <button type="button" className="remote-play-btn small" onClick={() => setEditingLife(false)}>Cancel</button>
          </>
        ) : (
          <>
            <span className="life-value">Life: {life ?? '—'}</span>
            <button type="button" className="remote-play-btn small" onClick={() => { setEditingLife(true); onLifeEditChange(String(life ?? 40)); }}>Edit</button>
          </>
        )}
      </div>
    </div>
  );
}

function ActionLine({ action }: { action: PlayAction }) {
  let payload: Record<string, unknown> | null = null;
  if (action.payload) {
    try {
      payload = JSON.parse(action.payload) as Record<string, unknown>;
    } catch {
      // ignore
    }
  }

  if (action.action_type === 'play_card' && payload?.scryfall_id) {
    const cardName = payload.card_name != null ? String(payload.card_name) : null;
    return (
      <div className="remote-play-log-line">
        <span className="log-user">{action.username}</span> played a card
        {cardName ? <span className="log-detail"> ({cardName})</span> : null}
        <span className="log-time">{new Date(action.created_at).toLocaleTimeString()}</span>
      </div>
    );
  }
  if (action.action_type === 'pass_turn') {
    return (
      <div className="remote-play-log-line">
        <span className="log-user">{action.username}</span> passed turn
        <span className="log-time">{new Date(action.created_at).toLocaleTimeString()}</span>
      </div>
    );
  }
  if (action.action_type === 'set_life' && payload?.life_total != null) {
    return (
      <div className="remote-play-log-line">
        <span className="log-user">{action.username}</span> set life to {String(payload.life_total)}
        <span className="log-time">{new Date(action.created_at).toLocaleTimeString()}</span>
      </div>
    );
  }

  return (
    <div className="remote-play-log-line">
      <span className="log-user">{action.username}</span> — {action.action_type}
      <span className="log-time">{new Date(action.created_at).toLocaleTimeString()}</span>
    </div>
  );
}
