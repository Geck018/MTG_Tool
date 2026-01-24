import { useState } from 'react';
import { useDeck } from './hooks/useDeck';
import { CardSearch } from './components/CardSearch';
import { DeckList } from './components/DeckList';
import { BulkImporter } from './components/BulkImporter';
import { DeckImporter } from './components/DeckImporter';
import { DeckValidator } from './components/DeckValidator';
import { ExportButton } from './components/ExportButton';
import { KeywordAnalyzer } from './components/KeywordAnalyzer';
import './App.css';

function App() {
  const { deck, addCard, removeCard, updateQuantity, moveCard, clearDeck, setDeckName } = useDeck();
  const [activeTab, setActiveTab] = useState<'build' | 'bulk' | 'import' | 'validate' | 'keywords'>('build');

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
        {activeTab === 'build' && (
          <div className="build-view">
            <div className="search-panel">
              <CardSearch 
                onCardSelect={(card) => addCard(card)} 
                deckCards={[...deck.cards, ...deck.sideboard].map(dc => dc.card)}
              />
            </div>
            <div className="deck-panel">
              <DeckList
                deck={deck}
                onRemove={removeCard}
                onUpdateQuantity={updateQuantity}
                onMove={moveCard}
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
