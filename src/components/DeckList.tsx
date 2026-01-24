import type { Deck, DeckCard } from '../types';

interface DeckListProps {
  deck: Deck;
  onRemove: (cardId: string, isSideboard: boolean) => void;
  onUpdateQuantity: (cardId: string, quantity: number, isSideboard: boolean) => void;
  onMove: (cardId: string, fromSideboard: boolean) => void;
  onClear: () => void;
}

export function DeckList({
  deck,
  onRemove,
  onUpdateQuantity,
  onMove,
  onClear
}: DeckListProps) {
  const mainDeckCount = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);
  const sideboardCount = deck.sideboard.reduce((sum, dc) => sum + dc.quantity, 0);

  const renderCardList = (cards: DeckCard[], isSideboard: boolean) => {
    if (cards.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div>No cards in {isSideboard ? 'sideboard' : 'main deck'}</div>
        </div>
      );
    }

    return (
      <div className="deck-card-list">
        {cards.map((deckCard) => (
          <div key={deckCard.card.id} className="deck-card-item">
            <div className="deck-card-info">
              <div className="deck-card-name">
                {deckCard.quantity}x {deckCard.card.name}
              </div>
              <div className="deck-card-details">
                {deckCard.card.mana_cost || 'No cost'} • {deckCard.card.type_line} • CMC: {deckCard.card.cmc}
              </div>
            </div>
            <div className="deck-card-controls">
              <div className="quantity-control">
                <button
                  className="quantity-btn"
                  onClick={() => onUpdateQuantity(deckCard.card.id, deckCard.quantity - 1, isSideboard)}
                  title="Decrease quantity"
                >
                  −
                </button>
                <span className="quantity-display">{deckCard.quantity}</span>
                <button
                  className="quantity-btn"
                  onClick={() => onUpdateQuantity(deckCard.card.id, deckCard.quantity + 1, isSideboard)}
                  title="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => onMove(deckCard.card.id, isSideboard)}
                title={isSideboard ? 'Move to main deck' : 'Move to sideboard'}
              >
                {isSideboard ? '→ Main' : '→ SB'}
              </button>
              <button
                className="btn btn-danger btn-small"
                onClick={() => onRemove(deckCard.card.id, isSideboard)}
                title="Remove card"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="deck-panel">
      <div className="deck-section">
        <div className="deck-section-title">
          <span>Main Deck</span>
          <span className="deck-count">{mainDeckCount} cards</span>
        </div>
        {renderCardList(deck.cards, false)}
      </div>

      <div className="deck-section">
        <div className="deck-section-title">
          <span>Sideboard</span>
          <span className="deck-count">{sideboardCount} cards</span>
        </div>
        {renderCardList(deck.sideboard, true)}
      </div>

      {(mainDeckCount > 0 || sideboardCount > 0) && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button className="btn btn-danger" onClick={onClear}>
            Clear Deck
          </button>
        </div>
      )}
    </div>
  );
}
