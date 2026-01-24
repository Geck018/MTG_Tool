import { useState } from 'react';
import type { GeneratedDeck } from '../services/deckGenerator';
import { DeckGenerator as DeckGeneratorService, MECHANICS, type MechanicType } from '../services/deckGenerator';
import { CollectionService } from '../utils/collection';
import { CardDetail } from './CardDetail';
import type { Card } from '../types';

interface DeckGeneratorProps {
  onDeckGenerated: (deck: GeneratedDeck) => void;
}

export function DeckGenerator({ onDeckGenerated }: DeckGeneratorProps) {
  const [selectedMechanic, setSelectedMechanic] = useState<MechanicType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedDeck, setGeneratedDeck] = useState<GeneratedDeck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const collection = CollectionService.getBulkCollection();
  const hasCollection = collection.length > 0;

  const handleGenerate = async () => {
    if (!selectedMechanic) return;

    setGenerating(true);
    setError(null);
    setGeneratedDeck(null);

    try {
      const deck = await DeckGeneratorService.generateDeck(selectedMechanic);
      
      if (!deck) {
        setError('Not enough cards in your collection matching this mechanic. Try importing more cards or selecting a different mechanic.');
        setGenerating(false);
        return;
      }

      setGeneratedDeck(deck);
      onDeckGenerated(deck);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate deck');
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadDeck = () => {
    if (generatedDeck) {
      onDeckGenerated(generatedDeck);
    }
  };

  if (!hasCollection) {
    return (
      <div className="deck-generator">
        <div className="empty-state">
          <h2>No Collection Found</h2>
          <p>You need to import your collection first to generate decks.</p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Go to "Import Bulk" to upload your collection CSV.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-generator">
      <div className="generator-header">
        <h2 className="panel-title">Generate Deck from Collection</h2>
        <div className="collection-info">
          <span>{collection.length} cards in collection</span>
        </div>
      </div>

      <div className="mechanic-selection">
        <h3>Select a Playstyle/Mechanic</h3>
        <div className="mechanic-grid">
          {MECHANICS.map(mechanic => (
            <button
              key={mechanic.id}
              className={`mechanic-card ${selectedMechanic === mechanic.id ? 'selected' : ''}`}
              onClick={() => setSelectedMechanic(mechanic.id)}
              disabled={generating}
            >
              <div className="mechanic-name">{mechanic.name}</div>
              <div className="mechanic-description">{mechanic.description}</div>
              {mechanic.colorPreferences && mechanic.colorPreferences.length > 0 && (
                <div className="mechanic-colors">
                  Colors: {mechanic.colorPreferences.join(', ')}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="generator-actions">
        <button
          className="btn"
          onClick={handleGenerate}
          disabled={!selectedMechanic || generating}
        >
          {generating ? 'Generating Deck...' : 'Generate Deck'}
        </button>
        {generatedDeck && (
          <button
            className="btn btn-secondary"
            onClick={handleLoadDeck}
          >
            Load into Deck Builder
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {generating && (
        <div className="loading">
          <p>Analyzing your collection...</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            This may take a minute while we load card data and find synergies.
          </p>
        </div>
      )}

      {generatedDeck && (
        <div className="generated-deck">
          <div className="deck-summary">
            <h3>Generated Deck</h3>
            <div className="deck-stats">
              <span>Total Cards: {generatedDeck.cards.reduce((sum, dc) => sum + dc.quantity, 0)}</span>
              <span>•</span>
              <span>Synergy Score: {generatedDeck.synergyScore}/100</span>
              <span>•</span>
              <span>Colors: {generatedDeck.colorIdentity.join(', ') || 'Colorless'}</span>
            </div>
          </div>

          <div className="deck-cards-section">
            <h4>Deck Cards ({generatedDeck.cards.length} unique)</h4>
            <div className="deck-cards-list">
              {generatedDeck.cards.map((deckCard, index) => (
                <div
                  key={`${deckCard.card.id}-${index}`}
                  className="generated-card-item"
                  onClick={() => setSelectedCard(deckCard.card)}
                >
                  <span className="card-quantity">{deckCard.quantity}x</span>
                  <span className="card-name">{deckCard.card.name}</span>
                  {deckCard.card.mana_cost && (
                    <span className="card-mana">{deckCard.card.mana_cost}</span>
                  )}
                  <span className="card-type">{deckCard.card.type_line}</span>
                </div>
              ))}
            </div>
          </div>

          {generatedDeck.suggestedCards.length > 0 && (
            <div className="suggested-cards-section">
              <h4>Suggested Cards to Enhance Your Deck</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                These cards would work well with your deck but aren't in your collection.
              </p>
              <div className="suggested-cards-list">
                {generatedDeck.suggestedCards.map((suggestion, index) => (
                  <div
                    key={`${suggestion.card.id}-${index}`}
                    className={`suggested-card-item priority-${suggestion.priority}`}
                    onClick={() => setSelectedCard(suggestion.card)}
                  >
                    <div className="suggested-card-header">
                      <span className="suggested-card-name">{suggestion.card.name}</span>
                      {suggestion.card.mana_cost && (
                        <span className="suggested-card-mana">{suggestion.card.mana_cost}</span>
                      )}
                      <span className={`priority-badge priority-${suggestion.priority}`}>
                        {suggestion.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="suggested-card-reason">{suggestion.reason}</div>
                    <div className="suggested-card-meta">
                      <span>{suggestion.card.type_line}</span>
                      {suggestion.card.prices?.usd && (
                        <span>${suggestion.card.prices.usd}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          deckCards={[]}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
