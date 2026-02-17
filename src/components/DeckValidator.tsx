import { useState, useEffect } from 'react';
import type { Deck, DeckCard } from '../types';
import { DeckValidator as Validator } from '../utils/deckValidation';
import { useAuth } from '../contexts/AuthContext';
import { userApi, deckApi } from '../services/api';
import { ScryfallService } from '../services/scryfall';
import type { UserDeck } from '../database/types';

const FORMAT_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'modern', label: 'Modern' },
  { value: 'pioneer', label: 'Pioneer' },
  { value: 'legacy', label: 'Legacy' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'pauper', label: 'Pauper' },
  { value: 'commander', label: 'Commander' },
  { value: 'casual', label: 'Casual' },
];

export function DeckValidator() {
  const { user } = useAuth();
  const [format, setFormat] = useState('standard');
  const [myDecks, setMyDecks] = useState<UserDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | ''>('');
  const [loadedDeck, setLoadedDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(false);
  const [decksLoading, setDecksLoading] = useState(true);

  useEffect(() => {
    if (!user?.username) {
      setMyDecks([]);
      setDecksLoading(false);
      return;
    }
    setDecksLoading(true);
    userApi.getDecks(user.username)
      .then(setMyDecks)
      .catch(() => setMyDecks([]))
      .finally(() => setDecksLoading(false));
  }, [user?.username]);

  useEffect(() => {
    if (selectedDeckId === '') {
      setLoadedDeck(null);
      return;
    }
    setLoading(true);
    setLoadedDeck(null);
    (async () => {
      try {
        const deckWithCards = await deckApi.get(selectedDeckId as number, true);
        const BATCH = 15;
        const main: DeckCard[] = [];
        const sideboard: DeckCard[] = [];
        const mainCards = deckWithCards.cards.filter((c) => !c.is_sideboard);
        const sbCards = deckWithCards.cards.filter((c) => c.is_sideboard);
        for (let i = 0; i < mainCards.length; i += BATCH) {
          const batch = mainCards.slice(i, i + BATCH);
          const cards = await Promise.all(batch.map((c) => ScryfallService.getCardById(c.scryfall_id)));
          for (let j = 0; j < batch.length; j++) {
            const card = cards[j];
            if (card) main.push({ card, quantity: batch[j].quantity });
          }
        }
        for (let i = 0; i < sbCards.length; i += BATCH) {
          const batch = sbCards.slice(i, i + BATCH);
          const cards = await Promise.all(batch.map((c) => ScryfallService.getCardById(c.scryfall_id)));
          for (let j = 0; j < batch.length; j++) {
            const card = cards[j];
            if (card) sideboard.push({ card, quantity: batch[j].quantity });
          }
        }
        setLoadedDeck({
          name: deckWithCards.name,
          cards: main,
          sideboard,
          wishlist: []
        });
      } catch {
        setLoadedDeck(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDeckId]);

  const validation = loadedDeck ? Validator.validate(loadedDeck, format) : null;
  const rules = Validator.getFormatRules(format);

  return (
    <div className="validation-result">
      <h2 className="panel-title">Deck Validation</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Select a deck you’ve already imported to validate it for a format.
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Deck:
        </label>
        <select
          value={selectedDeckId === '' ? '' : selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={decksLoading}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            minWidth: '200px'
          }}
        >
          <option value="">Select a deck…</option>
          {myDecks.map((d) => (
            <option key={d.deck_id} value={d.deck_id}>
              {d.deck_name} ({d.card_count} cards)
            </option>
          ))}
        </select>
        {decksLoading && <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Loading…</span>}
        {!decksLoading && myDecks.length === 0 && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No saved decks. Import a deck first from the Import Deck tab.
          </p>
        )}
      </div>

      {loading && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Loading deck cards…</p>
      )}

      {loadedDeck && !loading && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Format:
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {rules && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Rules: {rules.mainMin}{rules.mainMax ? `–${rules.mainMax}` : '+'} main
                {rules.sideboardMax > 0 && `, up to ${rules.sideboardMax} sideboard`}
                {rules.sideboardMax === 0 && format === 'commander' && ', no sideboard'}
                ; max {rules.maxCopies} copy per card{rules.maxCopies === 1 ? ' (singleton)' : ''}
                {rules.pauperOnly ? '; commons only' : ''}. Banned/restricted lists enforced.
              </p>
            )}
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            background: validation!.isValid ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${validation!.isValid ? 'var(--success)' : 'var(--error)'}`,
            color: validation!.isValid ? 'var(--success)' : 'var(--error)',
            fontWeight: 600
          }}>
            {validation!.isValid ? '✓ Deck is valid!' : '✗ Deck has errors'}
          </div>

          {validation!.errors.length > 0 && (
            <div className="validation-section">
              <h3 className="validation-section-title" style={{ color: 'var(--error)' }}>
                Errors ({validation!.errors.length})
              </h3>
              <ul className="validation-list">
                {validation!.errors.map((error, index) => (
                  <li key={index} className="validation-item error">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation!.warnings.length > 0 && (
            <div className="validation-section">
              <h3 className="validation-section-title" style={{ color: 'var(--warning)' }}>
                Warnings ({validation!.warnings.length})
              </h3>
              <ul className="validation-list">
                {validation!.warnings.map((warning, index) => (
                  <li key={index} className="validation-item warning">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validation!.suggestions.length > 0 && (
            <div className="validation-section">
              <h3 className="validation-section-title" style={{ color: 'var(--success)' }}>
                Suggestions ({validation!.suggestions.length})
              </h3>
              <ul className="validation-list">
                {validation!.suggestions.map((suggestion, index) => (
                  <li key={index} className="validation-item suggestion">{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {validation!.errors.length === 0 && validation!.warnings.length === 0 && validation!.suggestions.length === 0 && (
            <div className="empty-state">
              <div>No issues found! Your deck looks good.</div>
            </div>
          )}
        </>
      )}

      {!loadedDeck && !loading && selectedDeckId !== '' && (
        <p style={{ color: 'var(--text-secondary)' }}>Could not load deck. Try again.</p>
      )}
    </div>
  );
}
