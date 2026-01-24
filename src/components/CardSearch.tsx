import { useState, useEffect, useRef } from 'react';
import type { Card } from '../types';
import { ScryfallService } from '../services/scryfall';
import { CardDetail } from './CardDetail';

interface CardSearchProps {
  onCardSelect: (card: Card) => void;
  deckCards?: Card[];
  wishlistCards?: Card[];
  showAddButton?: boolean;
  onAddToDeck?: (card: Card) => void;
  onAddToWishlist?: (card: Card) => void;
}

export function CardSearch({ onCardSelect, deckCards = [], wishlistCards = [], showAddButton = false, onAddToDeck, onAddToWishlist }: CardSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const cards = await ScryfallService.searchCard(query);
      setResults(cards.slice(0, 20)); // Limit to 20 results
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleCardClick = (card: Card) => {
    // In search mode, show details instead of adding
    if (showAddButton) {
      handleCardDetail(card);
    } else {
      setSelectedCard(card);
      onCardSelect(card);
      setQuery('');
      setResults([]);
    }
  };

  const handleCardDetail = (card: Card) => {
    setDetailCard(card);
  };

  return (
    <div className="search-panel">
      <h2 className="panel-title">Search Cards</h2>
      <input
        type="text"
        className="card-search-input"
        placeholder="Search for cards (e.g., Lightning Bolt, Jace, the Mind Sculptor)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <div className="loading">Searching...</div>}

      {!loading && results.length > 0 && (
        <div className="search-results">
          {results.map((card) => (
            <div
              key={card.id}
              className="card-result"
            >
              <div 
                className="card-result-content"
                onClick={() => handleCardClick(card)}
              >
                <div className="card-result-header">
                  <div className="card-result-name">{card.name}</div>
                  <div className="card-result-mana">{card.mana_cost || ''}</div>
                </div>
                <div className="card-result-type">{card.type_line}</div>
                {card.oracle_text && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {card.oracle_text.substring(0, 100)}...
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardDetail(card);
                  }}
                >
                  View Details
                </button>
                {showAddButton && onAddToDeck && (
                  <button
                    className="btn btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToDeck(card);
                      setQuery('');
                      setResults([]);
                    }}
                  >
                    Add to Deck
                  </button>
                )}
                {showAddButton && onAddToWishlist && (
                  <button
                    className={`btn btn-small ${wishlistCards.some(wc => wc.id === card.id) ? 'btn-wishlist-active' : 'btn-secondary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToWishlist(card);
                    }}
                    title={wishlistCards.some(wc => wc.id === card.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    {wishlistCards.some(wc => wc.id === card.id) ? '⭐' : '☆'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="empty-state">
          <div>No cards found</div>
        </div>
      )}

      {selectedCard && (
        <div className="success-message" style={{ marginTop: '1rem' }}>
          Added {selectedCard.name} to deck
        </div>
      )}

      {detailCard && (
        <CardDetail
          card={detailCard}
          deckCards={deckCards}
          onAddToDeck={showAddButton && onAddToDeck ? onAddToDeck : undefined}
          onAddToWishlist={showAddButton && onAddToWishlist ? onAddToWishlist : undefined}
          isWishlisted={wishlistCards.some(wc => wc.id === detailCard.id)}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  );
}
