import { useState, useEffect } from 'react';
import type { BulkCard } from '../types';
import { CollectionService } from '../utils/collection';
import { ScryfallService } from '../services/scryfall';
import type { Card } from '../types';
import { CardDetail } from './CardDetail';

export function CollectionViewer() {
  const [collection, setCollection] = useState<BulkCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardDetails, setCardDetails] = useState<Map<string, Card>>(new Map());

  useEffect(() => {
    loadCollection();
  }, []);

  const loadCollection = () => {
    const bulkCards = CollectionService.getBulkCollection();
    setCollection(bulkCards);
  };

  const loadCardDetails = async (bulkCard: BulkCard) => {
    if (cardDetails.has(bulkCard.name)) {
      setSelectedCard(cardDetails.get(bulkCard.name)!);
      return;
    }

    try {
      const card = await ScryfallService.getCardByName(bulkCard.name, bulkCard.set);
      if (card) {
        setCardDetails(prev => new Map(prev).set(bulkCard.name, card));
        setSelectedCard(card);
      }
    } catch (error) {
      console.error('Error loading card:', error);
    }
  };

  const filteredCollection = collection.filter(card =>
    card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (card.set && card.set.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalCards = collection.reduce((sum, card) => sum + card.quantity, 0);
  const uniqueCards = collection.length;

  return (
    <div className="collection-viewer">
      <div className="collection-header">
        <h2 className="panel-title">My Collection</h2>
        <div className="collection-stats">
          <span>{uniqueCards} unique cards</span>
          <span>•</span>
          <span>{totalCards} total cards</span>
        </div>
      </div>

      <div className="collection-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search collection..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (confirm('Clear all collection data? This cannot be undone.')) {
              localStorage.removeItem('mtg_bulk_collection');
              setCollection([]);
              setCardDetails(new Map());
            }
          }}
        >
          Clear Collection
        </button>
      </div>

      {collection.length === 0 ? (
        <div className="empty-state">
          <p>No collection imported yet.</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Go to "Import Bulk" to upload your collection CSV.
          </p>
        </div>
      ) : (
        <>
          <div className="collection-list">
            {filteredCollection.length === 0 ? (
              <div className="empty-state">No cards match your search.</div>
            ) : (
              filteredCollection.map((bulkCard, index) => (
                <div
                  key={`${bulkCard.name}-${bulkCard.set}-${bulkCard.collector_number}-${index}`}
                  className="collection-item"
                  onClick={() => loadCardDetails(bulkCard)}
                >
                  <div className="collection-item-main">
                    <div className="collection-item-name">{bulkCard.name}</div>
                    <div className="collection-item-meta">
                      {bulkCard.set && <span className="collection-item-set">{bulkCard.set}</span>}
                      {bulkCard.collector_number && (
                        <span className="collection-item-number">#{bulkCard.collector_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="collection-item-quantity">×{bulkCard.quantity}</div>
                </div>
              ))
            )}
          </div>

          {selectedCard && (
            <CardDetail
              card={selectedCard}
              deckCards={[]}
              onClose={() => setSelectedCard(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
