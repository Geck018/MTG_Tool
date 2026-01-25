import type { Deck } from '../types';
import { CSVService } from '../utils/csv';
import { CollectionService } from '../utils/collection';

interface ExportButtonProps {
  deck: Deck;
  onCollectionUpdated?: () => void;
}

export function ExportButton({ deck, onCollectionUpdated }: ExportButtonProps) {
  const handleExport = () => {
    const allCards = [...deck.cards, ...deck.sideboard, ...deck.wishlist];
    
    if (allCards.length === 0) {
      alert('Deck is empty. Nothing to export.');
      return;
    }

    const csv = CSVService.exportToCSVWithWishlist(allCards, deck.wishlist);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name || 'deck'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Remove exported cards (main deck + sideboard only, not wishlist) from collection
    const cardsToRemove = [...deck.cards, ...deck.sideboard];
    if (cardsToRemove.length > 0) {
      let removedCount = 0;
      for (const deckCard of cardsToRemove) {
        const removed = CollectionService.removeCard(deckCard.card.name, deckCard.quantity);
        if (removed) {
          removedCount += deckCard.quantity;
        }
      }
      
      if (removedCount > 0) {
        // Notify parent component to refresh collection view if needed
        if (onCollectionUpdated) {
          onCollectionUpdated();
        }
        console.log(`Removed ${removedCount} cards from collection after export`);
      }
    }
  };

  const mainDeckCount = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);
  const sideboardCount = deck.sideboard.reduce((sum, dc) => sum + dc.quantity, 0);
  const wishlistCount = deck.wishlist.reduce((sum, dc) => sum + dc.quantity, 0);
  const totalCount = mainDeckCount + sideboardCount + wishlistCount;

  return (
    <button
      className="btn"
      onClick={handleExport}
      disabled={totalCount === 0}
      title="Export deck + wishlist to CSV (compatible with MythicTools)"
    >
      📥 Export CSV ({totalCount} cards{wishlistCount > 0 ? `, ${wishlistCount} wishlist` : ''})
    </button>
  );
}
