import { useState } from 'react';
import type { Deck, DeckCard } from '../types';
import { CSVService } from '../utils/csv';
import { ScryfallService } from '../services/scryfall';

interface DeckImporterProps {
  onDeckImported: (deck: Deck) => void;
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

  const parseDeckList = (text: string): Array<{ quantity: number; name: string }> => {
    const lines = text.trim().split('\n');
    const cards: Array<{ quantity: number; name: string }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      // Check for sideboard marker (skip for now, sideboard handled separately)
      if (trimmed.toLowerCase().includes('sideboard') || trimmed === 'SB:') {
        continue;
      }

      // Parse format: "2 Lightning Bolt" or "2x Lightning Bolt"
      const match = trimmed.match(/^(\d+)\s*x?\s*(.+)$/);
      if (match) {
        cards.push({
          quantity: parseInt(match[1]),
          name: match[2].trim()
        });
      }
    }

    return cards;
  };

  const handleImport = async () => {
    if (!deckText.trim()) {
      setMessage({ type: 'error', text: 'Please paste deck list or upload a file' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Try CSV format first
      let deckCards: DeckCard[] = [];
      let sideboardCards: DeckCard[] = [];

      if (deckText.includes(',')) {
        // CSV format
        deckCards = await CSVService.parseDeckCSV(deckText);
      } else {
        // Plain text format
        const parsedCards = parseDeckList(deckText);
        let foundSideboard = false;

        for (const parsedCard of parsedCards) {
          const card = await ScryfallService.getCardByName(parsedCard.name);
          if (card) {
            if (foundSideboard) {
              sideboardCards.push({ card, quantity: parsedCard.quantity });
            } else {
              deckCards.push({ card, quantity: parsedCard.quantity });
            }
          }
        }
      }

      if (deckCards.length === 0 && sideboardCards.length === 0) {
        setMessage({ type: 'error', text: 'No valid cards found. Please check the format.' });
        setLoading(false);
        return;
      }

      const importedDeck: Deck = {
        name: 'Imported Deck',
        cards: deckCards,
        sideboard: sideboardCards
      };

      setMessage({
        type: 'success',
        text: `Imported ${deckCards.length} main deck cards and ${sideboardCards.length} sideboard cards.`
      });

      onDeckImported(importedDeck);
      setDeckText('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error importing deck: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-panel">
      <h2 className="panel-title">Import Deck</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Import a deck from a text file or paste a deck list. Supports formats like "2 Lightning Bolt" or CSV.
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
          placeholder="2 Lightning Bolt&#10;4 Counterspell&#10;20 Island&#10;&#10;Sideboard:&#10;2 Negate&#10;3 Dispel"
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

Sideboard:
2 Negate
3 Dispel

Format 2 (CSV):
Name,Quantity
Lightning Bolt,2
Counterspell,4`}
        </pre>
      </div>
    </div>
  );
}
