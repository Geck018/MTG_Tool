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
import { DeckAnalysis } from './DeckAnalysis';
import { CardScanner } from './CardScanner';
import { RulesChat } from './RulesChat';
import { ScryfallService } from '../services/scryfall';
import { deckApi } from '../services/api';
import type { Card } from '../types';

interface MTGAppProps {
  onBack: () => void;
}

export function MTGApp({ onBack }: MTGAppProps) {
  const { deck, addCard, removeCard, updateQuantity, moveCard, toggleWishlist, removeFromWishlist, updateWishlistQuantity, clearDeck, setDeckName } = useDeck();
  const [activeTab, setActiveTab] = useState<'import' | 'collection' | 'workspace' | 'search' | 'rules'>('import');
  const [searchScope, setSearchScope] = useState<'scryfall' | 'collection'>('scryfall');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [collectionUpdateKey, setCollectionUpdateKey] = useState(0);
  const [showScanner, setShowScanner] = useState(false);

  const handleLoadDeck = async (deckId: number) => {
    try {
      const deckWithCards = await deckApi.get(deckId, true);
      clearDeck();
      setDeckName(deckWithCards.name);
      const BATCH = 15;
      for (let i = 0; i < deckWithCards.cards.length; i += BATCH) {
        const batch = deckWithCards.cards.slice(i, i + BATCH);
        const cards = await Promise.all(
          batch.map((c) => ScryfallService.getCardById(c.scryfall_id))
        );
        for (let j = 0; j < batch.length; j++) {
          const card = cards[j];
          if (card) {
            addCard(card, batch[j].quantity, batch[j].is_sideboard);
          }
        }
      }
      setActiveTab('workspace');
    } catch (err) {
      console.error('Failed to load deck:', err);
    }
  };

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
          className={activeTab === 'import' ? 'active' : ''}
          onClick={() => setActiveTab('import')}
        >
          Import Deck
        </button>
        <button
          className={activeTab === 'collection' ? 'active' : ''}
          onClick={() => setActiveTab('collection')}
        >
          Collection
        </button>
        <button
          className={activeTab === 'workspace' ? 'active' : ''}
          onClick={() => setActiveTab('workspace')}
        >
          Deck Workspace
        </button>
        <button
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          className={activeTab === 'rules' ? 'active' : ''}
          onClick={() => setActiveTab('rules')}
        >
          Rules + Keywords
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'import' && (
          <DeckImporter onDeckImported={(importedDeck) => {
            clearDeck();
            importedDeck.cards.forEach(dc => addCard(dc.card, dc.quantity, false));
            importedDeck.sideboard.forEach(dc => addCard(dc.card, dc.quantity, true));
            setDeckName(importedDeck.name);
            setActiveTab('workspace');
          }} />
        )}

        {activeTab === 'collection' && (
          <div>
            <CollectionViewer key={collectionUpdateKey} onLoadDeck={handleLoadDeck} />
            <div style={{ marginTop: '1rem' }}>
              <BulkImporter onCardsImported={(cards) => {
                try {
                  localStorage.setItem('mtg_bulk_collection', JSON.stringify(cards));
                  setCollectionUpdateKey((prev) => prev + 1);
                } catch (error) {
                  console.error('Failed to save bulk collection:', error);
                }
              }} />
            </div>
          </div>
        )}

        {activeTab === 'workspace' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Unified deck area: build/edit your current deck, then run validation and analysis on uploaded decks.
            </p>
            <div className="deck-panel-full" style={{ marginBottom: '1.5rem' }}>
              <DeckList
                deck={deck}
                onRemove={removeCard}
                onUpdateQuantity={updateQuantity}
                onMove={moveCard}
                onToggleWishlist={(cardId, isSideboard) => {
                  const source = isSideboard ? deck.sideboard : deck.cards;
                  const card = source.find(dc => dc.card.id === cardId);
                  if (card) toggleWishlist(card.card, card.quantity);
                }}
                onRemoveFromWishlist={removeFromWishlist}
                onUpdateWishlistQuantity={updateWishlistQuantity}
                onClear={clearDeck}
              />
            </div>
            <DeckValidator />
            <div style={{ marginTop: '1.5rem' }}>
              <DeckAnalysis />
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="search-view">
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button className={`btn ${searchScope === 'scryfall' ? '' : 'btn-secondary'}`} onClick={() => setSearchScope('scryfall')}>
                Search Scryfall
              </button>
              <button className={`btn ${searchScope === 'collection' ? '' : 'btn-secondary'}`} onClick={() => setSearchScope('collection')}>
                Search My Collection
              </button>
            </div>
            {searchScope === 'scryfall' ? (
              <>
                <CardSearch
                  onCardSelect={handleCardSelect}
                  deckCards={[...deck.cards, ...deck.sideboard].map(dc => dc.card)}
                  wishlistCards={deck.wishlist.map(dc => dc.card)}
                  showAddButton={true}
                  onAddToDeck={(card) => addCard(card)}
                  onAddToWishlist={(card) => {
                    const inWishlist = deck.wishlist.some(wc => wc.card.id === card.id);
                    if (inWishlist) removeFromWishlist(card.id);
                    else toggleWishlist(card, 1);
                  }}
                />
                {selectedCard && (
                  <CardDetail
                    card={selectedCard}
                    deckCards={[...deck.cards, ...deck.sideboard].map(dc => dc.card)}
                    onAddToDeck={(card) => addCard(card)}
                    onAddToWishlist={(card) => {
                      const inWishlist = deck.wishlist.some(wc => wc.card.id === card.id);
                      if (inWishlist) removeFromWishlist(card.id);
                      else toggleWishlist(card, 1);
                    }}
                    isWishlisted={deck.wishlist.some(wc => wc.card.id === selectedCard.id)}
                    onClose={handleCloseCard}
                  />
                )}
              </>
            ) : (
              <CollectionViewer key={`search-collection-${collectionUpdateKey}`} onLoadDeck={handleLoadDeck} />
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div>
            <RulesChat gameSystem="mtg" />
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Keywords (current deck)</h3>
              <KeywordAnalyzer deck={deck} />
            </div>
          </div>
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
