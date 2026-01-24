import { useState, useEffect } from 'react';
import { useDeck } from './hooks/useDeck';
import { CardSearch } from './components/CardSearch';
import { DeckList } from './components/DeckList';
import { BulkImporter } from './components/BulkImporter';
import { DeckImporter } from './components/DeckImporter';
import { DeckValidator } from './components/DeckValidator';
import { ExportButton } from './components/ExportButton';
import { KeywordAnalyzer } from './components/KeywordAnalyzer';
import { CollectionViewer } from './components/CollectionViewer';
import { CardDetail } from './components/CardDetail';
import { DeckGenerator } from './components/DeckGenerator';
import { ScryfallService } from './services/scryfall';
import { MECHANICS } from './services/deckGenerator';
import type { Card } from './types';
import type { GeneratedDeck } from './services/deckGenerator';
import './App.css';

function App() {
  const { deck, addCard, removeCard, updateQuantity, moveCard, toggleWishlist, removeFromWishlist, updateWishlistQuantity, clearDeck, setDeckName } = useDeck();
  const [activeTab, setActiveTab] = useState<'search' | 'build' | 'bulk' | 'collection' | 'generate' | 'import' | 'validate' | 'keywords'>('search');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Handle URL routing for card details
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/card/')) {
      const cardName = decodeURIComponent(hash.replace('#/card/', ''));
      loadCardFromUrl(cardName);
    }
  }, []);

  const loadCardFromUrl = async (cardName: string) => {
    try {
      const card = await ScryfallService.getCardByName(cardName);
      if (card) {
        setSelectedCard(card);
        setActiveTab('search'); // Show search tab when viewing card
      }
    } catch (error) {
      console.error('Error loading card from URL:', error);
    }
  };

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card);
    // Update URL without page reload
    window.history.pushState({}, '', `#/card/${encodeURIComponent(card.name)}`);
  };

  const handleCloseCard = () => {
    setSelectedCard(null);
    // Clear URL hash
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎴 MTG Deck Builder</h1>
        <div className="header-actions">
          <input
            type="text"
            value={deck.name}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Deck Name"
            className="deck-name-input"
          />
          <ExportButton deck={deck} />
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
            // Store bulk cards in localStorage for future use
            try {
              localStorage.setItem('mtg_bulk_collection', JSON.stringify(cards));
            } catch (error) {
              console.error('Failed to save bulk collection:', error);
            }
          }} />
        )}

        {activeTab === 'collection' && (
          <CollectionViewer />
        )}

        {activeTab === 'generate' && (
          <DeckGenerator onDeckGenerated={(generatedDeck: GeneratedDeck) => {
            // Clear current deck
            clearDeck();
            // Add generated deck cards
            generatedDeck.cards.forEach(dc => {
              addCard(dc.card, dc.quantity, false);
            });
            // Add suggested cards to wishlist
            generatedDeck.suggestedCards.forEach(suggestion => {
              toggleWishlist(suggestion.card, 1);
            });
            setDeckName(`${MECHANICS.find(m => m.id === generatedDeck.mechanic)?.name || 'Generated'} Deck`);
            setActiveTab('build');
          }} />
        )}

        {activeTab === 'import' && (
          <DeckImporter onDeckImported={(importedDeck) => {
            // Replace current deck with imported deck
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
      </main>
    </div>
  );
}

export default App;
