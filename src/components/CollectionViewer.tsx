import { useState, useEffect, useMemo, useRef } from 'react';
import type { BulkCard } from '../types';
import { CollectionService } from '../utils/collection';
import { ScryfallService } from '../services/scryfall';
import type { Card } from '../types';
import { CardDetail } from './CardDetail';
import { getCardCategory, getCategoryOrder, ALL_CATEGORIES, type CardCategory } from '../utils/cardCategories';

interface CollectionCard extends BulkCard {
  cardData?: Card;
  loading?: boolean;
  failed?: boolean; // Mark cards that failed to load
}

type SortOption = 'name' | 'cmc' | 'rarity' | 'set' | 'quantity';
type ViewMode = 'tile' | 'list';

export function CollectionViewer() {
  const [collection, setCollection] = useState<CollectionCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CardCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('tile');
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadCollection();
  }, []);

  useEffect(() => {
    // Load card data for all cards (with batching to avoid rate limits)
    // This will continuously load batches until all cards are loaded
    // Skip cards that are already loading, have data, or have failed
    if (collection.length > 0 && collection.some(c => !c.cardData && !c.loading && !c.failed) && !loadingRef.current) {
      loadCardDataBatch();
    }
  }, [collection.length]);

  const loadCollection = () => {
    const bulkCards = CollectionService.getBulkCollection();
    setCollection(bulkCards.map(card => ({ ...card, loading: false })));
  };

  const removeFromCollection = (cardToRemove: CollectionCard, removeAll: boolean = false) => {
    setCollection(prev => {
      let updated: CollectionCard[];
      
      if (removeAll || cardToRemove.quantity <= 1) {
        // Remove entirely
        updated = prev.filter(c => 
          !(c.name === cardToRemove.name && c.set === cardToRemove.set && c.collector_number === cardToRemove.collector_number)
        );
      } else {
        // Decrease quantity by 1
        updated = prev.map(c => 
          (c.name === cardToRemove.name && c.set === cardToRemove.set && c.collector_number === cardToRemove.collector_number)
            ? { ...c, quantity: c.quantity - 1 }
            : c
        );
      }
      
      // Save to localStorage
      const bulkCards = updated.map(({ cardData, loading, failed, ...rest }) => rest);
      localStorage.setItem('mtg_bulk_collection', JSON.stringify(bulkCards));
      
      return updated;
    });
  };

  const loadCardDataBatch = async () => {
    if (loadingRef.current) return;
    
    // Get current collection state
    setCollection(current => {
      // Get cards that need loading from current state (skip failed ones)
      const cardsToLoad = current.filter(c => !c.cardData && !c.loading && !c.failed).slice(0, 20);
      if (cardsToLoad.length === 0) {
        loadingRef.current = false;
        return current;
      }
      
      loadingRef.current = true;
      
      // Mark as loading
      const updated = current.map(c => 
        cardsToLoad.some(ct => ct.name === c.name && ct.set === c.set)
          ? { ...c, loading: true }
          : c
      );

      // Create a map of name->set for cards that have sets
      const setMap = new Map<string, string>();
      cardsToLoad.forEach(c => {
        if (c.set) {
          setMap.set(c.name, c.set);
        }
      });

      // Load in parallel batches for better performance
      const cardNames = cardsToLoad.map(c => c.name);
      ScryfallService.getCardsByName(cardNames, setMap.size > 0 ? setMap : undefined, 20)
        .then(cardMap => {
          // Update collection with loaded cards
          setCollection(prev => {
            const updated = prev.map(c => {
              const card = cardMap.get(c.name);
              if (card && cardsToLoad.some(ct => ct.name === c.name && ct.set === c.set)) {
                return { ...c, cardData: card, loading: false, failed: false };
              } else if (cardsToLoad.some(ct => ct.name === c.name && ct.set === c.set)) {
                // Mark as failed so we don't retry infinitely
                return { ...c, loading: false, failed: true };
              }
              return c;
            });
            
            loadingRef.current = false;
            
            // Check if there are more cards to load and trigger next batch
            // Skip failed cards - only continue if component is still mounted
            if (mountedRef.current) {
              const remaining = updated.filter(c => !c.cardData && !c.loading && !c.failed);
              if (remaining.length > 0) {
                // Trigger next batch after a short delay
                timeoutRef.current = setTimeout(() => {
                  if (mountedRef.current) {
                    loadCardDataBatch();
                  }
                }, 100);
              }
            }
            
            return updated;
          });
        })
        .catch(error => {
          console.error('Error loading card batch:', error);
          setCollection(prev => {
            loadingRef.current = false;
            return prev.map(c => 
              cardsToLoad.some(ct => ct.name === c.name && ct.set === c.set)
                ? { ...c, loading: false, failed: true }
                : c
            );
          });
        });

      return updated;
    });
  };

  const loadCardDetails = async (bulkCard: CollectionCard) => {
    if (bulkCard.cardData) {
      setSelectedCard(bulkCard.cardData);
      return;
    }

    try {
      const card = await ScryfallService.getCardByName(bulkCard.name, bulkCard.set);
      if (card) {
        setCollection(prev => prev.map(c => 
          c.name === bulkCard.name && c.set === bulkCard.set
            ? { ...c, cardData: card }
            : c
        ));
        setSelectedCard(card);
      }
    } catch (error) {
      console.error('Error loading card:', error);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = collection.filter(card => {
      const matchesSearch = 
        card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.set && card.set.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All' || 
        (card.cardData && getCardCategory(card.cardData) === selectedCategory);
      
      return matchesSearch && matchesCategory;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cmc':
          const cmcA = a.cardData?.cmc ?? 999;
          const cmcB = b.cardData?.cmc ?? 999;
          return cmcA - cmcB;
        case 'rarity':
          const rarityOrder: Record<string, number> = { 'common': 1, 'uncommon': 2, 'rare': 3, 'mythic': 4 };
          const rarityA = rarityOrder[a.cardData?.rarity?.toLowerCase() || ''] || 0;
          const rarityB = rarityOrder[b.cardData?.rarity?.toLowerCase() || ''] || 0;
          return rarityB - rarityA;
        case 'set':
          const setA = a.set || '';
          const setB = b.set || '';
          return setA.localeCompare(setB);
        case 'quantity':
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });

    return filtered;
  }, [collection, searchTerm, selectedCategory, sortBy]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<CardCategory, CollectionCard[]> = {
      'Basic Land': [],
      'Nonbasic Land': [],
      'Artifact': [],
      'Creature': [],
      'Planeswalker': [],
      'Instant': [],
      'Sorcery': [],
      'Enchantment': [],
      'Other': []
    };

    filteredAndSorted.forEach(card => {
      if (card.cardData) {
        const category = getCardCategory(card.cardData);
        groups[category].push(card);
      } else {
        groups['Other'].push(card);
      }
    });

    // Remove empty categories
    return Object.entries(groups)
      .filter(([_, cards]) => cards.length > 0)
      .sort(([catA], [catB]) => {
        const orderA = getCategoryOrder(catA as CardCategory);
        const orderB = getCategoryOrder(catB as CardCategory);
        return orderA - orderB;
      })
      .map(([category, cards]) => ({ category: category as CardCategory, cards }));
  }, [filteredAndSorted]);

  const totalCards = collection.reduce((sum, card) => sum + card.quantity, 0);
  const uniqueCards = collection.length;
  const cardsWithData = collection.filter(c => c.cardData).length;
  const loadingProgress = uniqueCards > 0 ? `${cardsWithData}/${uniqueCards}` : '';

  return (
    <div className="collection-viewer">
      <div className="collection-header">
        <h2 className="panel-title">My Collection</h2>
        <div className="collection-stats">
          <span>{uniqueCards} unique</span>
          <span>•</span>
          <span>{totalCards} total</span>
          {cardsWithData < uniqueCards && (
            <>
              <span>•</span>
              <span>Loading: {loadingProgress}</span>
            </>
          )}
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
        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as CardCategory | 'All')}
        >
          <option value="All">All Categories</option>
          {ALL_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="name">Sort by Name</option>
          <option value="cmc">Sort by CMC</option>
          <option value="rarity">Sort by Rarity</option>
          <option value="set">Sort by Set</option>
          <option value="quantity">Sort by Quantity</option>
        </select>
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === 'tile' ? 'active' : ''}`}
            onClick={() => setViewMode('tile')}
            title="Tile View"
          >
            ⬜
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            ☰
          </button>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (confirm('Clear all collection data? This cannot be undone.')) {
              localStorage.removeItem('mtg_bulk_collection');
              setCollection([]);
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
          {viewMode === 'tile' ? (
            <div className="collection-tiles">
              {groupedByCategory.map(({ category, cards }) => (
                <div key={category} className="collection-category">
                  <h3 className="category-header">
                    {category} ({cards.length})
                  </h3>
                  <div className="tile-grid">
                      {cards.map((bulkCard, index) => (
                        <div
                          key={`${bulkCard.name}-${bulkCard.set}-${bulkCard.collector_number}-${index}`}
                          className={`collection-tile ${bulkCard.failed ? 'tile-failed' : ''}`}
                          onClick={() => loadCardDetails(bulkCard)}
                        >
                          {bulkCard.loading ? (
                            <div className="tile-loading">Loading...</div>
                          ) : bulkCard.cardData?.image_uris?.normal ? (
                            <img
                              src={bulkCard.cardData.image_uris.normal}
                              alt={bulkCard.name}
                              className="tile-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="tile-placeholder">
                              <div className="tile-placeholder-name">{bulkCard.name}</div>
                              <div className="tile-placeholder-type">
                                {bulkCard.failed ? 'Card not found' : (bulkCard.cardData?.type_line || 'Loading...')}
                              </div>
                            </div>
                          )}
                        <div className="tile-overlay">
                          <div className="tile-name">{bulkCard.name}</div>
                          <div className="tile-quantity">×{bulkCard.quantity}</div>
                          {bulkCard.cardData && (
                            <div className="tile-meta">
                              {bulkCard.cardData.mana_cost && (
                                <span className="tile-mana">{bulkCard.cardData.mana_cost}</span>
                              )}
                              {bulkCard.set && (
                                <span className="tile-set">{bulkCard.set}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="tile-actions">
                          <button
                            className="tile-remove-btn"
                            onClick={(e) => { e.stopPropagation(); removeFromCollection(bulkCard, false); }}
                            title="Remove 1"
                          >
                            −
                          </button>
                          {bulkCard.quantity > 1 && (
                            <button
                              className="tile-remove-all-btn"
                              onClick={(e) => { e.stopPropagation(); removeFromCollection(bulkCard, true); }}
                              title="Remove all"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="collection-list">
              {filteredAndSorted.length === 0 ? (
                <div className="empty-state">No cards match your filters.</div>
              ) : (
                filteredAndSorted.map((bulkCard, index) => (
                  <div
                    key={`${bulkCard.name}-${bulkCard.set}-${bulkCard.collector_number}-${index}`}
                    className="collection-item"
                    onClick={() => loadCardDetails(bulkCard)}
                  >
                    {bulkCard.cardData?.image_uris?.small && (
                      <img
                        src={bulkCard.cardData.image_uris.small}
                        alt={bulkCard.name}
                        className="collection-item-image"
                      />
                    )}
                    <div className="collection-item-main">
                      <div className="collection-item-name">{bulkCard.name}</div>
                      <div className="collection-item-meta">
                        {bulkCard.cardData && (
                          <>
                            <span className="collection-item-type">
                              {getCardCategory(bulkCard.cardData)}
                            </span>
                            {bulkCard.cardData.mana_cost && (
                              <span className="collection-item-mana">
                                {bulkCard.cardData.mana_cost}
                              </span>
                            )}
                          </>
                        )}
                        {bulkCard.set && <span className="collection-item-set">{bulkCard.set}</span>}
                        {bulkCard.collector_number && (
                          <span className="collection-item-number">#{bulkCard.collector_number}</span>
                        )}
                      </div>
                    </div>
                    <div className="collection-item-quantity">×{bulkCard.quantity}</div>
                    <div className="collection-item-actions">
                      <button
                        className="item-remove-btn"
                        onClick={(e) => { e.stopPropagation(); removeFromCollection(bulkCard, false); }}
                        title="Remove 1"
                      >
                        −
                      </button>
                      {bulkCard.quantity > 1 && (
                        <button
                          className="item-remove-all-btn"
                          onClick={(e) => { e.stopPropagation(); removeFromCollection(bulkCard, true); }}
                          title="Remove all"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

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
