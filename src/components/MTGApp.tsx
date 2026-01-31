import { useState, useEffect } from 'react';
import { useDeck } from '../hooks/useDeck';
import { CardSearch } from './CardSearch';
import { DeckList } from './DeckList';
import { BulkImporter } from './BulkImporter';
import { DeckImporter } from './DeckImporter';
import { DeckValidator } from './DeckValidator';
import { ExportButton } from './ExportButton';
import { KeywordAnalyzer } from './KeywordAnalyzer';
import { CollectionViewer } from './CollectionViewer';
import { CardDetail } from './CardDetail';
import { DeckGenerator } from './DeckGenerator';
import { CommanderDeckGenerator } from './CommanderDeckGenerator';
import { DeckAnalysis } from './DeckAnalysis';
import { CardScanner } from './CardScanner';
import { ScryfallService } from '../services/scryfall';
import { MECHANICS, FORMATS } from '../services/deckGenerator';
import type { Card } from '../types';
import type { GeneratedDeck } from '../services/deckGenerator';
import type { CommanderDeckOption } from '../services/commanderDeckGenerator';

interface MTGAppProps {
  onBack: () => void;
}

export function MTGApp({ onBack }: MTGAppProps) {
  const { deck, addCard, removeCard, updateQuantity, moveCard, toggleWishlist, removeFromWishlist, updateWishlistQuantity, clearDeck, setDeckName } = useDeck();
  const [activeTab, setActiveTab] = useState<'search' | 'build' | 'bulk' | 'collection' | 'generate' | 'commander' | 'import' | 'validate' | 'keywords' | 'analysis'>('search');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [collectionUpdateKey, setCollectionUpdateKey] = useState(0);
  const [showScanner, setShowScanner] = useState(false);

  // Handle URL routing for card details
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/mtg/card/')) {
      const cardName = decodeURIComponent(hash.replace('#/mtg/card/', ''));
      loadCardFromUrl(cardName);
    }
  }, []);

  const loadCardFromUrl = async (cardName: string) => {
    try {
      const card = await ScryfallService.getCardByName(cardName);
      if (card) {
        setSelectedCard(card);
        setActiveTab('search');
      }
    } catch (error) {
      console.error('Error loading card from URL:', error);
    }
  };

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card);
    window.history.pushState({}, '', `#/mtg/card/${encodeURIComponent(card.name)}`);
  };

  const handleCloseCard = () => {
    setSelectedCard(null);
    window.history.pushState({}, '', '#/mtg');
  };

  return (
    <div className="app mtg-app">
      <header className="app-header mtg-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            ← Back to Games
          </button>
          <h1>🎴 MTG Deck Builder</h1>
        </div>
        <div className="header-actions">
          <button className="scan-button" onClick={() => setShowScanner(true)}>
            📷 Scan Card
          </button>
          <input
            type="text"
            value={deck.name}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Deck Name"
            className="deck-name-input"
          />
          <ExportButton 
            deck={deck} 
            onCollectionUpdated={() => {
              setCollectionUpdateKey(prev => prev + 1);
            }} 
          />
        </div>
      </header>

      <nav className="tab-nav">
        <button
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          Search Cards
        </button>
        <button
          className={activeTab === 'build' ? 'active' : ''}
          onClick={() => setActiveTab('build')}
        >
          Build Deck
        </button>
        <button
          className={activeTab === 'bulk' ? 'active' : ''}
          onClick={() => setActiveTab('bulk')}
        >
          Import Bulk
        </button>
        <button
          className={activeTab === 'collection' ? 'active' : ''}
          onClick={() => setActiveTab('collection')}
        >
          My Collection
        </button>
        <button
          className={activeTab === 'generate' ? 'active' : ''}
          onClick={() => setActiveTab('generate')}
        >
          Generate Deck
        </button>
        <button
          className={activeTab === 'commander' ? 'active' : ''}
          onClick={() => setActiveTab('commander')}
        >
          Commander Deck
        </button>
        <button
          className={activeTab === 'import' ? 'active' : ''}
          onClick={() => setActiveTab('import')}
        >
          Import Deck
        </button>
        <button
          className={activeTab === 'validate' ? 'active' : ''}
          onClick={() => setActiveTab('validate')}
        >
          Validate
        </button>
        <button
          className={activeTab === 'keywords' ? 'active' : ''}
          onClick={() => setActiveTab('keywords')}
        >
          Keywords
        </button>
        <button
          className={activeTab === 'analysis' ? 'active' : ''}
          onClick={() => setActiveTab('analysis')}
        >
          Deck Analysis
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'search' && (
          <div className="search-view">
            <CardSearch 
              onCardSelect={handleCardSelect}
              deckCards={[...deck.cards, ...deck.sideboard].map(dc => dc.card)}
              wishlistCards={deck.wishlist.map(dc => dc.card)}
              showAddButton={true}
              onAddToDeck={(card) => addCard(card)}
              onAddToWishlist={(card) => {
                const inWishlist = deck.wishlist.some(wc => wc.card.id === card.id);
                if (inWishlist) {
                  removeFromWishlist(card.id);
                } else {
                  toggleWishlist(card, 1);
                }
              }}
            />
            {selectedCard && (
              <CardDetail
                card={selectedCard}
                deckCards={[...deck.cards, ...deck.sideboard].map(dc => dc.card)}
                onAddToDeck={(card) => addCard(card)}
                onAddToWishlist={(card) => {
                  const inWishlist = deck.wishlist.some(wc => wc.card.id === card.id);
                  if (inWishlist) {
                    removeFromWishlist(card.id);
                  } else {
                    toggleWishlist(card, 1);
                  }
                }}
                isWishlisted={deck.wishlist.some(wc => wc.card.id === selectedCard.id)}
                onClose={handleCloseCard}
              />
            )}
          </div>
        )}

        {activeTab === 'build' && (
          <div className="build-view">
            <div className="deck-panel-full">
              <DeckList
                deck={deck}
                onRemove={removeCard}
                onUpdateQuantity={updateQuantity}
                onMove={moveCard}
                onToggleWishlist={(cardId, isSideboard) => {
                  const source = isSideboard ? deck.sideboard : deck.cards;
                  const card = source.find(dc => dc.card.id === cardId);
                  if (card) {
                    toggleWishlist(card.card, card.quantity);
                  }
                }}
                onRemoveFromWishlist={removeFromWishlist}
                onUpdateWishlistQuantity={updateWishlistQuantity}
                onClear={clearDeck}
              />
            </div>
          </div>
        )}

        {activeTab === 'bulk' && (
          <BulkImporter onCardsImported={(cards) => {
            try {
              localStorage.setItem('mtg_bulk_collection', JSON.stringify(cards));
            } catch (error) {
              console.error('Failed to save bulk collection:', error);
            }
          }} />
        )}

        {activeTab === 'collection' && (
          <CollectionViewer key={collectionUpdateKey} />
        )}

        {activeTab === 'generate' && (
          <DeckGenerator onDeckGenerated={(generatedDeck: GeneratedDeck) => {
            clearDeck();
            generatedDeck.cards.forEach(dc => {
              addCard(dc.card, dc.quantity, false);
            });
            generatedDeck.suggestedCards.forEach(suggestion => {
              toggleWishlist(suggestion.card, 1);
            });
            const formatName = FORMATS.find(f => f.id === generatedDeck.format)?.name || '';
            const mechanicName = MECHANICS.find(m => m.id === generatedDeck.mechanic)?.name || 'Generated';
            setDeckName(`${mechanicName} ${formatName} Deck`);
            setActiveTab('build');
          }} />
        )}

        {activeTab === 'commander' && (
          <CommanderDeckGenerator onDeckGenerated={(option: CommanderDeckOption) => {
            clearDeck();
            option.cards.forEach(dc => {
              addCard(dc.card, dc.quantity, false);
            });
            option.suggestedCards.forEach(suggestion => {
              toggleWishlist(suggestion.card, 1);
            });
            setDeckName(option.name);
            setActiveTab('build');
          }} />
        )}

        {activeTab === 'import' && (
          <DeckImporter onDeckImported={(importedDeck) => {
            clearDeck();
            importedDeck.cards.forEach(dc => addCard(dc.card, dc.quantity, false));
            importedDeck.sideboard.forEach(dc => addCard(dc.card, dc.quantity, true));
            setDeckName(importedDeck.name);
            setActiveTab('build');
          }} />
        )}

        {activeTab === 'validate' && (
          <DeckValidator deck={deck} />
        )}

        {activeTab === 'keywords' && (
          <KeywordAnalyzer deck={deck} />
        )}

        {activeTab === 'analysis' && (
          <DeckAnalysis onDeckAnalyzed={(_importedDeck) => {
            // Optionally load the analyzed deck into the builder
          }} />
        )}
      </main>

      {/* Card Scanner Overlay */}
      {showScanner && (
        <CardScanner 
          onCardAdded={(card) => {
            // Card was added to collection via API
            // Refresh collection if viewing it
            setCollectionUpdateKey(prev => prev + 1);
            console.log('Added to collection:', card.name);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
