import { useState, useEffect } from 'react';
import type { CommanderDeckOption } from '../services/commanderDeckGenerator';
import { CommanderDeckGenerator as CommanderDeckGeneratorService } from '../services/commanderDeckGenerator';
import { CollectionService } from '../utils/collection';
import { ScryfallService } from '../services/scryfall';
import { FORMATS, type FormatType } from '../services/deckGenerator';
import type { Card } from '../types';
import { CardDetail } from './CardDetail';

interface CommanderDeckGeneratorProps {
  onDeckGenerated: (option: CommanderDeckOption) => void;
}

export function CommanderDeckGenerator({ onDeckGenerated }: CommanderDeckGeneratorProps) {
  const [collection, setCollection] = useState<Array<{ bulkCard: { name: string; set?: string }; card: Card }>>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [selectedCommander, setSelectedCommander] = useState<Card | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('commander');
  const [generating, setGenerating] = useState(false);
  const [deckOptions, setDeckOptions] = useState<CommanderDeckOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const bulkCollection = CollectionService.getBulkCollection();
  const hasCollection = bulkCollection.length > 0;

  useEffect(() => {
    if (hasCollection) {
      loadLegendaryCreatures();
    }
  }, [hasCollection]);

  const loadLegendaryCreatures = async () => {
    setLoadingCollection(true);
    const legendaryCards: Array<{ bulkCard: { name: string; set?: string }; card: Card }> = [];

    for (const bulkCard of bulkCollection) {
      try {
        const card = await ScryfallService.getCardByName(bulkCard.name, bulkCard.set);
        if (card && card.type_line.toLowerCase().includes('legendary') && 
            card.type_line.toLowerCase().includes('creature')) {
          legendaryCards.push({ bulkCard, card });
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error loading ${bulkCard.name}:`, error);
      }
    }

    setCollection(legendaryCards);
    setLoadingCollection(false);
  };

  const handleGenerate = async () => {
    if (!selectedCommander) return;

    setGenerating(true);
    setError(null);
    setDeckOptions(null);

    try {
      const options = await CommanderDeckGeneratorService.generateDeckOptions(selectedCommander, selectedFormat);
      
      if (!options || options.length === 0) {
        setError('Not enough cards in your collection to build deck options around this commander. Try importing more cards.');
        setGenerating(false);
        return;
      }

      setDeckOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate deck options');
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadDeck = (option: CommanderDeckOption) => {
    onDeckGenerated(option);
  };

  const filteredCommanders = collection.filter(({ card }) =>
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasCollection) {
    return (
      <div className="commander-deck-generator">
        <div className="empty-state">
          <h2>No Collection Found</h2>
          <p>You need to import your collection first to generate commander decks.</p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Go to "Import Bulk" to upload your collection CSV.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="commander-deck-generator">
      <div className="generator-header">
        <h2 className="panel-title">Generate Commander Deck</h2>
        <div className="collection-info">
          <span>{collection.length} legendary creatures found</span>
        </div>
      </div>

      <div className="format-selection" style={{ marginBottom: '2rem' }}>
        <h3>Select Format</h3>
        <div className="format-buttons">
          {FORMATS.filter(f => f.id === 'commander' || f.id === 'vintage' || f.id === 'legacy').map(format => (
            <button
              key={format.id}
              className={`format-button ${selectedFormat === format.id ? 'selected' : ''}`}
              onClick={() => setSelectedFormat(format.id)}
              disabled={generating}
            >
              <div className="format-name">{format.name}</div>
              <div className="format-details">
                {format.deckSize} cards • Max {format.maxCopies} copies
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="commander-selection">
        <h3>Select Your Commander</h3>
        <div className="commander-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search legendary creatures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loadingCollection ? (
          <div className="loading">Loading legendary creatures from your collection...</div>
        ) : (
          <div className="commander-grid">
            {filteredCommanders.length === 0 ? (
              <div className="empty-state">No legendary creatures found matching your search.</div>
            ) : (
              filteredCommanders.map(({ card }) => (
                <button
                  key={card.id}
                  className={`commander-card ${selectedCommander?.id === card.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCommander(card)}
                  disabled={generating}
                >
                  {card.image_uris?.small && (
                    <img 
                      src={card.image_uris.small} 
                      alt={card.name}
                      className="commander-image"
                    />
                  )}
                  <div className="commander-info">
                    <div className="commander-name">{card.name}</div>
                    <div className="commander-type">{card.type_line}</div>
                    {card.mana_cost && (
                      <div className="commander-mana">{card.mana_cost}</div>
                    )}
                    {card.oracle_text && (
                      <div className="commander-text">
                        {card.oracle_text.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="generator-actions">
        <button
          className="btn"
          onClick={handleGenerate}
          disabled={!selectedCommander || generating}
        >
          {generating ? 'Generating Deck Options...' : 'Generate Deck Options'}
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {generating && (
        <div className="loading">
          <p>Analyzing your collection and building deck options...</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            This may take a minute while we find synergies and build multiple deck variants.
          </p>
        </div>
      )}

      {deckOptions && deckOptions.length > 0 && (
        <div className="deck-options">
          <h3>Deck Options for {selectedCommander?.name}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Choose one of the generated deck options below:
          </p>
          
          <div className="options-grid">
            {deckOptions.map((option, index) => (
              <div key={index} className="deck-option-card">
                <div className="option-header">
                  <h4>{option.strategy}</h4>
                  <div className="option-stats">
                    <span>{option.cards.reduce((sum, dc) => sum + dc.quantity, 0)} cards</span>
                    <span>•</span>
                    <span>Synergy: {option.synergyScore}/100</span>
                  </div>
                </div>
                <p className="option-description">{option.description}</p>
                <div className="option-colors">
                  Colors: {option.colorIdentity.join(', ') || 'Colorless'}
                </div>
                
                <div className="option-cards-preview">
                  <div className="preview-title">Key Cards ({option.cards.slice(0, 10).length} shown):</div>
                  <div className="preview-list">
                    {option.cards.slice(0, 10).map((deckCard, i) => (
                      <div key={i} className="preview-item">
                        {deckCard.quantity}x {deckCard.card.name}
                      </div>
                    ))}
                    {option.cards.length > 10 && (
                      <div className="preview-more">+{option.cards.length - 10} more cards</div>
                    )}
                  </div>
                </div>

                {option.suggestedCards.length > 0 && (
                  <div className="option-suggestions">
                    <div className="suggestions-title">
                      {option.suggestedCards.length} suggested cards to enhance
                    </div>
                  </div>
                )}

                <button
                  className="btn"
                  onClick={() => handleLoadDeck(option)}
                >
                  Load This Deck
                </button>
              </div>
            ))}
          </div>
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
