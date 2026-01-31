import { useState } from 'react';
import type { BulkCard, Card } from '../types';
import { SmartImportService, ImportedCard, ImportResult } from '../services/smartImport';
import { useAuth } from '../contexts/AuthContext';
import { collectionApi } from '../services/api';

interface BulkImporterProps {
  onCardsImported: (cards: BulkCard[]) => void;
}

export function BulkImporter({ onCardsImported }: BulkImporterProps) {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; cardName: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingToDb, setSavingToDb] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!inputText.trim()) {
      setMessage({ type: 'error', text: 'Please paste card list or upload a file' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setResult(null);
    setProgress({ current: 0, total: 0, cardName: '' });

    try {
      const importResult = await SmartImportService.importCards(
        inputText,
        (current, total, cardName) => {
          setProgress({ current, total, cardName });
        }
      );
      
      setResult(importResult);
      setProgress(null);
      
      if (importResult.total === 0) {
        setMessage({ type: 'error', text: 'No card names found in the input.' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error importing cards: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCard = (index: number, card: Card) => {
    if (!result) return;
    
    const updatedCards = [...result.cards];
    updatedCards[index] = {
      ...updatedCards[index],
      name: card.name,
      card: card,
      status: 'found',
      suggestions: undefined
    };
    
    setResult({
      ...result,
      cards: updatedCards,
      found: result.found + 1,
      ambiguous: result.ambiguous - 1
    });
  };

  const handleRemoveCard = (index: number) => {
    if (!result) return;
    
    const removedCard = result.cards[index];
    const updatedCards = result.cards.filter((_, i) => i !== index);
    
    setResult({
      ...result,
      cards: updatedCards,
      total: result.total - 1,
      found: removedCard.status === 'found' ? result.found - 1 : result.found,
      notFound: removedCard.status === 'not_found' ? result.notFound - 1 : result.notFound,
      ambiguous: removedCard.status === 'ambiguous' ? result.ambiguous - 1 : result.ambiguous
    });
  };

  const handleSaveToCollection = async () => {
    if (!result || !user) return;
    
    const foundCards = result.cards.filter(c => c.status === 'found' && c.card);
    if (foundCards.length === 0) {
      setMessage({ type: 'error', text: 'No verified cards to save.' });
      return;
    }

    setSavingToDb(true);
    
    try {
      // Save to database
      for (const importedCard of foundCards) {
        if (importedCard.card) {
          await collectionApi.addCard(user.username, importedCard.card.id, importedCard.quantity);
        }
      }
      
      // Also save to localStorage for offline access
      const bulkCards: BulkCard[] = foundCards.map(c => ({
        name: c.card!.name,
        quantity: c.quantity,
        set: c.card!.set_name,
        collector_number: c.card!.collector_number
      }));
      
      // Merge with existing collection
      let existingCards: BulkCard[] = [];
      try {
        const existing = localStorage.getItem('mtg_bulk_collection');
        if (existing) {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            existingCards = parsed;
          }
        }
      } catch {
        // Ignore corrupted localStorage data
      }
      const merged = [...existingCards, ...bulkCards];
      localStorage.setItem('mtg_bulk_collection', JSON.stringify(merged));
      
      setMessage({
        type: 'success',
        text: `Added ${foundCards.length} cards (${foundCards.reduce((sum, c) => sum + c.quantity, 0)} total copies) to your collection!`
      });
      
      onCardsImported(bulkCards);
      setInputText('');
      setResult(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error saving to collection: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setSavingToDb(false);
    }
  };

  const handleSaveLocalOnly = () => {
    if (!result) return;
    
    const foundCards = result.cards.filter(c => c.status === 'found' && c.card);
    if (foundCards.length === 0) {
      setMessage({ type: 'error', text: 'No verified cards to save.' });
      return;
    }

    const bulkCards: BulkCard[] = foundCards.map(c => ({
      name: c.card!.name,
      quantity: c.quantity,
      set: c.card!.set_name,
      collector_number: c.card!.collector_number
    }));
    
    // Merge with existing collection
    let existingCards: BulkCard[] = [];
    try {
      const existing = localStorage.getItem('mtg_bulk_collection');
      if (existing) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          existingCards = parsed;
        }
      }
    } catch {
      // Ignore corrupted localStorage data
    }
    const merged = [...existingCards, ...bulkCards];
    localStorage.setItem('mtg_bulk_collection', JSON.stringify(merged));
    
    setMessage({
      type: 'success',
      text: `Saved ${foundCards.length} cards locally!`
    });
    
    onCardsImported(bulkCards);
    setInputText('');
    setResult(null);
  };

  return (
    <div className="import-panel">
      <h2 className="panel-title">Smart Card Import</h2>
      <p className="import-description">
        Paste your card list in any format. We'll use Scryfall to identify each card.
      </p>

      {!result && (
        <>
          <div className="file-input-wrapper">
            <label className="file-input-label">
              📁 Upload File
              <input
                type="file"
                accept=".txt,.csv,.dek"
                className="file-input"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <div className="import-textarea-wrapper">
            <textarea
              className="import-textarea"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Paste your card list in any format:\n\n4x Lightning Bolt\n2 Counterspell\nSwords to Plowshares\nPath to Exile (MH3)\n\nWe'll figure it out!`}
              rows={12}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={loading || !inputText.trim()}
          >
            {loading ? 'Processing...' : 'Import Cards'}
          </button>

          {progress && (
            <div className="import-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }} 
                />
              </div>
              <p className="progress-text">
                Processing {progress.current} of {progress.total}: {progress.cardName}
              </p>
            </div>
          )}
        </>
      )}

      {result && (
        <div className="import-results">
          <div className="import-summary">
            <div className="summary-stat found">
              <span className="stat-value">{result.found}</span>
              <span className="stat-label">Found</span>
            </div>
            <div className="summary-stat ambiguous">
              <span className="stat-value">{result.ambiguous}</span>
              <span className="stat-label">Need Selection</span>
            </div>
            <div className="summary-stat not-found">
              <span className="stat-value">{result.notFound}</span>
              <span className="stat-label">Not Found</span>
            </div>
          </div>

          <div className="import-cards-list">
            {result.cards.map((card, index) => (
              <ImportedCardRow
                key={`${card.originalLine}-${index}`}
                card={card}
                onSelect={(selectedCard) => handleSelectCard(index, selectedCard)}
                onRemove={() => handleRemoveCard(index)}
              />
            ))}
          </div>

          <div className="import-actions">
            <button
              className="btn btn-secondary"
              onClick={() => { setResult(null); setInputText(''); }}
            >
              Start Over
            </button>
            
            {!user && (
              <button
                className="btn btn-primary"
                onClick={handleSaveLocalOnly}
                disabled={result.found === 0}
              >
                Save Locally ({result.found} cards)
              </button>
            )}
            
            {user && (
              <button
                className="btn btn-primary"
                onClick={handleSaveToCollection}
                disabled={result.found === 0 || savingToDb}
              >
                {savingToDb ? 'Saving...' : `Add to Collection (${result.found} cards)`}
              </button>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      {!result && (
        <div className="import-help">
          <h3>Supported Formats</h3>
          <ul>
            <li><code>4x Lightning Bolt</code></li>
            <li><code>4 Lightning Bolt</code></li>
            <li><code>Lightning Bolt x4</code></li>
            <li><code>Lightning Bolt (4)</code></li>
            <li><code>Lightning Bolt</code> (assumes 1)</li>
            <li><code>Lightning Bolt (LEB)</code> (with set code)</li>
            <li>CSV files from other collection managers</li>
            <li>MTGO/Arena export formats</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Sub-component for each imported card row
function ImportedCardRow({ 
  card, 
  onSelect, 
  onRemove 
}: { 
  card: ImportedCard; 
  onSelect: (card: Card) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(card.status === 'ambiguous');

  return (
    <div className={`imported-card-row ${card.status}`}>
      <div className="card-row-main">
        <span className={`status-indicator ${card.status}`}>
          {card.status === 'found' && '✓'}
          {card.status === 'not_found' && '✗'}
          {card.status === 'ambiguous' && '?'}
        </span>
        
        <span className="card-quantity">{card.quantity}x</span>
        
        <span className="card-name-text">
          {card.card?.name || card.name}
          {card.set && <span className="card-set"> ({card.set})</span>}
        </span>

        {card.card?.image_uris?.small && (
          <img 
            src={card.card.image_uris.small} 
            alt={card.card.name}
            className="card-thumbnail"
          />
        )}

        <div className="card-row-actions">
          {card.status === 'ambiguous' && (
            <button 
              className="btn-small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'Select'}
            </button>
          )}
          <button 
            className="btn-small btn-remove"
            onClick={onRemove}
            title="Remove"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && card.suggestions && (
        <div className="card-suggestions">
          <p className="suggestions-label">Did you mean:</p>
          <div className="suggestions-grid">
            {card.suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className="suggestion-card"
                onClick={() => { onSelect(suggestion); setExpanded(false); }}
              >
                {suggestion.image_uris?.small ? (
                  <img src={suggestion.image_uris.small} alt={suggestion.name} />
                ) : (
                  <div className="suggestion-placeholder">{suggestion.name}</div>
                )}
                <span className="suggestion-name">{suggestion.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
