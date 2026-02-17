import { useState } from 'react';
import type { Deck, DeckCard, Card } from '../types';
import { deckApi } from '../services/api';

function minimalCard(scryfallId: string, name: string): Card {
  return {
    id: scryfallId,
    name,
    cmc: 0,
    type_line: '',
    colors: [],
    color_identity: [],
    rarity: '',
    set_name: '',
    collector_number: '',
  };
}

interface DeckImporterProps {
  onDeckImported: (deck: Deck) => void;
}

/** Parse deck list text into { quantity, name, set? }[] without calling Scryfall. */
function parseDeckListToCards(text: string): Array<{ quantity: number; name: string; set?: string }> {
  const lines = text.trim().split(/\r?\n/);
  const cards: Array<{ quantity: number; name: string; set?: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    if (trimmed.toLowerCase().includes('sideboard') || trimmed === 'SB:') continue;

    // Format: "1 Chromatic Lantern (PLG25) 1" or "14 Forest (PLST) JMP-74"
    const withSet = trimmed.match(/^(\d+)\s*x?\s*(.+?)\s*\(([A-Za-z0-9]{2,5})\)/);
    if (withSet) {
      const quantity = parseInt(withSet[1], 10);
      const name = withSet[2].trim();
      const set = withSet[3];
      if (name) cards.push({ quantity, name, set: set.toLowerCase() });
      continue;
    }

    // Format: "2 Lightning Bolt" or "2x Lightning Bolt"
    const simple = trimmed.match(/^(\d+)\s*x?\s*(.+)$/);
    if (simple) {
      const quantity = parseInt(simple[1], 10);
      const name = simple[2].trim();
      if (name) cards.push({ quantity, name });
    }
  }

  return cards;
}

export function DeckImporter({ onDeckImported }: DeckImporterProps) {
  const [deckText, setDeckText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setDeckText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!deckText.trim()) {
      setMessage({ type: 'error', text: 'Please paste deck list or upload a file' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const parsed = parseDeckListToCards(deckText);
      if (parsed.length === 0) {
        setMessage({ type: 'error', text: 'No valid lines found. Use format: "2 Lightning Bolt" or "1 Name (SET) 123".' });
        setLoading(false);
        return;
      }

      const { resolved, not_found } = await deckApi.resolveList(parsed);

      if (resolved.length === 0) {
        setMessage({
          type: 'error',
          text: not_found.length > 0
            ? `Could not find: ${not_found.slice(0, 5).join(', ')}${not_found.length > 5 ? '…' : ''}. Check names or try without set code.`
            : 'No valid cards resolved. Please check the format.'
        });
        setLoading(false);
        return;
      }

      const deckCards: DeckCard[] = resolved.map((r) => ({
        card: minimalCard(r.scryfall_id, r.name),
        quantity: r.quantity
      }));

      const importedDeck: Deck = {
        name: 'Imported Deck',
        cards: deckCards,
        sideboard: [],
        wishlist: []
      };

      let successText = `Imported ${resolved.length} card${resolved.length === 1 ? '' : 's'}.`;
      if (not_found.length > 0) {
        successText += ` (${not_found.length} not found: ${not_found.slice(0, 3).join(', ')}${not_found.length > 3 ? '…' : ''})`;
      }
      setMessage({ type: 'success', text: successText });

      onDeckImported(importedDeck);
      setDeckText('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error importing deck: ${error instanceof Error ? error.message : 'Unknown error'}. If Scryfall is blocked, the server will resolve names for you.`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-panel">
      <h2 className="panel-title">Import Deck</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Import a deck from a text file or paste a deck list. Card names are resolved on the server, so this works even when Scryfall is blocked on your network.
      </p>

      <div className="file-input-wrapper">
        <label className="file-input-label">
          📁 Upload Deck File
          <input
            type="file"
            accept=".txt,.csv"
            className="file-input"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Or paste deck list:
        </label>
        <textarea
          className="import-textarea"
          value={deckText}
          onChange={(e) => setDeckText(e.target.value)}
          placeholder="2 Lightning Bolt&#10;4 Counterspell&#10;20 Island&#10;1 Chromatic Lantern (PLG25) 1&#10;14 Forest (PLST) JMP-74"
        />
      </div>

      <button
        className="btn"
        onClick={handleImport}
        disabled={loading || !deckText.trim()}
      >
        {loading ? 'Importing...' : 'Import Deck'}
      </button>

      {message && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Supported Formats:</h3>
        <pre style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', overflow: 'auto' }}>
{`Format 1 (Text):
2 Lightning Bolt
4 Counterspell
20 Island

Format 2 (with set code):
1 Chromatic Lantern (PLG25) 1
14 Forest (PLST) JMP-74`}
        </pre>
      </div>
    </div>
  );
}
