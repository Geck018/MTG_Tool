import type { Deck, DeckCard } from '../types';
import { CollectionService } from '../utils/collection';

interface DeckListProps {
  deck: Deck;
  onRemove: (cardId: string, isSideboard: boolean) => void;
  onUpdateQuantity: (cardId: string, quantity: number, isSideboard: boolean) => void;
  onMove: (cardId: string, fromSideboard: boolean) => void;
  onToggleWishlist: (cardId: string, isSideboard: boolean) => void;
  onRemoveFromWishlist: (cardId: string) => void;
  onUpdateWishlistQuantity: (cardId: string, quantity: number) => void;
  onClear: () => void;
}

export function DeckList({
  deck,
  onRemove,
  onUpdateQuantity,
  onMove,
  onToggleWishlist,
  onRemoveFromWishlist,
  onUpdateWishlistQuantity,
  onClear
}: DeckListProps) {
  const mainDeckCount = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);
  const sideboardCount = deck.sideboard.reduce((sum, dc) => sum + dc.quantity, 0);
  const wishlistCount = deck.wishlist.reduce((sum, dc) => sum + dc.quantity, 0);
  const bulkCollection = CollectionService.getBulkCollection();
  const hasCollection = bulkCollection.length > 0;

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
        {cards.map((deckCard) => {
          const inWishlist = deck.wishlist.some(wc => wc.card.id === deckCard.card.id);
          const haveInCollection = hasCollection ? CollectionService.hasCard(deckCard.card.name, deckCard.quantity) : null;
          const haveQuantity = hasCollection ? CollectionService.getCardQuantity(deckCard.card.name) : null;
          const missingQuantity = hasCollection && haveQuantity !== null ? Math.max(0, deckCard.quantity - haveQuantity) : null;

          return (
            <div key={deckCard.card.id} className={`deck-card-item ${inWishlist ? 'wishlisted' : ''} ${hasCollection && missingQuantity && missingQuantity > 0 ? 'missing-from-collection' : ''}`}>
              <div className="deck-card-info">
                <div className="deck-card-name">
                  {deckCard.quantity}x {deckCard.card.name}
                  {inWishlist && <span className="wishlist-badge" title="In wishlist">⭐</span>}
                  {hasCollection && missingQuantity !== null && missingQuantity > 0 && (
                    <span className="missing-badge" title={`Need ${missingQuantity} more (have ${haveQuantity})`}>
                      ⚠️ Need {missingQuantity}
                    </span>
                  )}
                  {hasCollection && haveInCollection && (
                    <span className="have-badge" title="Have in collection">✓</span>
                  )}
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
                  className={`btn btn-small ${inWishlist ? 'btn-wishlist-active' : 'btn-secondary'}`}
                  onClick={() => onToggleWishlist(deckCard.card.id, isSideboard)}
                  title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  {inWishlist ? '⭐' : '☆'}
                </button>
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
          );
        })}
      </div>
    );
  };

  const renderWishlist = () => {
    if (deck.wishlist.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <div>No cards in wishlist</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Mark cards as wishlisted to track what you need to buy
          </div>
        </div>
      );
    }

    return (
      <div className="deck-card-list">
        {deck.wishlist.map((deckCard) => (
          <div key={deckCard.card.id} className="deck-card-item wishlisted">
            <div className="deck-card-info">
              <div className="deck-card-name">
                {deckCard.quantity}x {deckCard.card.name}
                <span className="wishlist-badge">⭐</span>
              </div>
              <div className="deck-card-details">
                {deckCard.card.mana_cost || 'No cost'} • {deckCard.card.type_line} • CMC: {deckCard.card.cmc}
              </div>
            </div>
            <div className="deck-card-controls">
              <div className="quantity-control">
                <button
                  className="quantity-btn"
                  onClick={() => onUpdateWishlistQuantity(deckCard.card.id, deckCard.quantity - 1)}
                  title="Decrease quantity"
                >
                  −
                </button>
                <span className="quantity-display">{deckCard.quantity}</span>
                <button
                  className="quantity-btn"
                  onClick={() => onUpdateWishlistQuantity(deckCard.card.id, deckCard.quantity + 1)}
                  title="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                className="btn btn-danger btn-small"
                onClick={() => onRemoveFromWishlist(deckCard.card.id)}
                title="Remove from wishlist"
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

      <div className="deck-section">
        <div className="deck-section-title">
          <span>⭐ Wishlist</span>
          <span className="deck-count">{wishlistCount} cards</span>
        </div>
        {renderWishlist()}
      </div>

      {hasCollection && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Collection Status:</strong> Your bulk collection is loaded ({bulkCollection.length} cards). 
          Cards marked with ⚠️ are missing from your collection.
        </div>
      )}

      {!hasCollection && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--warning)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--warning)' }}>
          💡 <strong>Tip:</strong> Import your bulk collection to see which cards you already have vs. need to buy!
        </div>
      )}

      {(mainDeckCount > 0 || sideboardCount > 0 || wishlistCount > 0) && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button className="btn btn-danger" onClick={onClear}>
            Clear Deck
          </button>
        </div>
      )}
    </div>
  );
}
