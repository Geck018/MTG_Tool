import { useState, useEffect } from 'react';
import type { Card, CardRuling, CardCombo } from '../types';
import { ScryfallService } from '../services/scryfall';
import { ComboAnalyzer } from '../services/combos';
import { KeywordAnalyzer } from '../services/keywords';
import { KnownComboService } from '../services/knownCombos';

interface CardDetailProps {
  card: Card;
  deckCards?: Card[];
  onAddToDeck?: (card: Card) => void;
  onAddToWishlist?: (card: Card) => void;
  isWishlisted?: boolean;
  onClose?: () => void;
}

export function CardDetail({ card, deckCards = [], onAddToDeck, onAddToWishlist, isWishlisted = false, onClose }: CardDetailProps) {
  const [rulings, setRulings] = useState<CardRuling[]>([]);
  const [combos, setCombos] = useState<CardCombo[]>([]);
  const [knownCombos, setKnownCombos] = useState<CardCombo[]>([]);
  const [loadingRulings, setLoadingRulings] = useState(false);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [showRulings, setShowRulings] = useState(false);
  const [showCombos, setShowCombos] = useState(false);
  const [comboCardDetail, setComboCardDetail] = useState<Card | null>(null);
  const [loadingComboCard, setLoadingComboCard] = useState<string | null>(null);

  useEffect(() => {
    if (showRulings && rulings.length === 0) {
      loadRulings();
    }
  }, [showRulings]);

  useEffect(() => {
    if (showCombos && combos.length === 0 && knownCombos.length === 0) {
      loadCombos();
      loadKnownCombos();
    }
  }, [showCombos]);

  useEffect(() => {
    // Load known combos immediately when card changes
    loadKnownCombos();
  }, [card.name]);

  const handleComboCardClick = async (comboCardName: string) => {
    setLoadingComboCard(comboCardName);
    try {
      const comboCard = await ScryfallService.getCardByName(comboCardName);
      if (comboCard) {
        setComboCardDetail(comboCard);
      } else {
        alert(`Could not find card: ${comboCardName}`);
      }
    } catch (error) {
      console.error('Error loading combo card:', error);
      alert(`Error loading card: ${comboCardName}`);
    } finally {
      setLoadingComboCard(null);
    }
  };

  const loadRulings = async () => {
    setLoadingRulings(true);
    try {
      const cardRulings = await ScryfallService.getCardRulings(card.id);
      setRulings(cardRulings);
    } catch (error) {
      console.error('Error loading rulings:', error);
    } finally {
      setLoadingRulings(false);
    }
  };

  const loadKnownCombos = () => {
    try {
      const allKnownCombos = KnownComboService.getAllCombosForCard(card.name);
      const convertedCombos: CardCombo[] = [];
      
      for (const { combo, type } of allKnownCombos) {
        const cardCombos = KnownComboService.convertToCardCombo(combo, type);
        convertedCombos.push(...cardCombos);
      }
      
      // Remove duplicates
      const uniqueCombos = convertedCombos.filter((combo, index, self) =>
        index === self.findIndex(c => c.cardName === combo.cardName)
      );
      
      setKnownCombos(uniqueCombos);
    } catch (error) {
      console.error('Error loading known combos:', error);
    }
  };

  const loadCombos = async () => {
    setLoadingCombos(true);
    try {
      let cardCombos: CardCombo[] = [];
      
      // Try to find combos with deck cards first
      if (deckCards.length > 0) {
        cardCombos = await ComboAnalyzer.findCombos(card, deckCards);
      }
      
      // If no deck combos, get suggested combos
      if (cardCombos.length === 0) {
        cardCombos = await ComboAnalyzer.getSuggestedCombos(card);
      }
      
      setCombos(cardCombos);
    } catch (error) {
      console.error('Error loading combos:', error);
    } finally {
      setLoadingCombos(false);
    }
  };

  const keywords = card.oracle_text ? KeywordAnalyzer.analyzeCard(card.oracle_text) : [];
  const manaSymbols = card.mana_cost || '';

  return (
    <div className="card-detail-overlay" onClick={onClose}>
      <div className="card-detail" onClick={(e) => e.stopPropagation()}>
        <div className="card-detail-header">
          <h2 className="card-detail-name">{card.name}</h2>
          {onClose && (
            <button className="card-detail-close" onClick={onClose}>×</button>
          )}
        </div>

        <div className="card-detail-content">
          <div className="card-detail-main">
            {card.image_uris?.normal && (
              <div className="card-detail-image">
                <img src={card.image_uris.normal} alt={card.name} />
              </div>
            )}

            <div className="card-detail-info">
              <div className="card-detail-mana">
                <strong>Mana Cost:</strong> {manaSymbols || 'No cost'}
              </div>
              <div className="card-detail-type">
                <strong>Type:</strong> {card.type_line}
              </div>
              {card.power && card.toughness && (
                <div className="card-detail-pt">
                  <strong>Power/Toughness:</strong> {card.power}/{card.toughness}
                </div>
              )}
              <div className="card-detail-cmc">
                <strong>CMC:</strong> {card.cmc}
              </div>
              <div className="card-detail-colors">
                <strong>Colors:</strong> {card.colors.length > 0 ? card.colors.join(', ') : 'Colorless'}
              </div>
              <div className="card-detail-set">
                <strong>Set:</strong> {card.set_name} ({card.collector_number})
              </div>
              {card.prices?.usd && (
                <div className="card-detail-price">
                  <strong>Price:</strong> ${card.prices.usd}
                </div>
              )}
            </div>
          </div>

          {card.oracle_text && (
            <div className="card-detail-text">
              <h3>Oracle Text</h3>
              <div className="card-text-content">
                {card.oracle_text.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {keywords.length > 0 && (
            <div className="card-detail-keywords">
              <h3>Keywords</h3>
              <div className="keyword-tags">
                {keywords.map(keyword => {
                  const rule = KeywordAnalyzer.getKeywordDefinition(keyword);
                  return (
                    <span key={keyword} className="keyword-tag" title={rule?.definition}>
                      {keyword}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card-detail-sections">
            <div className="card-detail-section">
              <button
                className="card-detail-toggle"
                onClick={() => setShowRulings(!showRulings)}
              >
                <span>📜 Rulings ({rulings.length})</span>
                <span>{showRulings ? '▼' : '▶'}</span>
              </button>
              {showRulings && (
                <div className="card-detail-section-content">
                  {loadingRulings ? (
                    <div className="loading">Loading rulings...</div>
                  ) : rulings.length > 0 ? (
                    <div className="rulings-list">
                      {rulings.map((ruling, i) => (
                        <div key={i} className="ruling-item">
                          <div className="ruling-date">{new Date(ruling.published_at).toLocaleDateString()}</div>
                          <div className="ruling-text">{ruling.comment}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No rulings available for this card</div>
                  )}
                </div>
              )}
            </div>

            <div className="card-detail-section">
              <button
                className="card-detail-toggle"
                onClick={() => setShowCombos(!showCombos)}
              >
                <span>⚡ Combos & Synergies ({knownCombos.length + combos.length})</span>
                <span>{showCombos ? '▼' : '▶'}</span>
              </button>
              {showCombos && (
                <div className="card-detail-section-content">
                  {knownCombos.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ color: 'var(--accent)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        📚 Known Popular Combos
                      </h4>
                      <div className="combos-list">
                        {knownCombos.map((combo, i) => (
                          <div 
                            key={`known-${i}`} 
                            className={`combo-item combo-${combo.synergy} ${loadingComboCard === combo.cardName ? 'loading' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleComboCardClick(combo.cardName)}
                            title={`Click to view ${combo.cardName} details`}
                          >
                            <div className="combo-card" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                              {loadingComboCard === combo.cardName ? 'Loading...' : combo.cardName}
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>→</span>
                            </div>
                            <div className="combo-reason">{combo.reason}</div>
                            <div className={`combo-badge combo-${combo.synergy}`}>
                              {combo.synergy.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {loadingCombos ? (
                    <div className="loading">Analyzing deck synergies...</div>
                  ) : combos.length > 0 ? (
                    <div>
                      <h4 style={{ color: 'var(--accent)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        🎴 Synergies in Your Deck
                      </h4>
                      <div className="combos-list">
                        {combos.map((combo, i) => (
                          <div 
                            key={`deck-${i}`} 
                            className={`combo-item combo-${combo.synergy} ${loadingComboCard === combo.cardName ? 'loading' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleComboCardClick(combo.cardName)}
                            title={`Click to view ${combo.cardName} details`}
                          >
                            <div className="combo-card" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                              {loadingComboCard === combo.cardName ? 'Loading...' : combo.cardName}
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>→</span>
                            </div>
                            <div className="combo-reason">{combo.reason}</div>
                            <div className={`combo-badge combo-${combo.synergy}`}>
                              {combo.synergy.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : deckCards.length > 0 ? (
                    <div className="empty-state" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      No synergies found in your current deck. Check out the known combos above for ideas!
                    </div>
                  ) : (
                    <div className="empty-state" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Add cards to your deck to see synergies, or check out the known combos above for ideas!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {(onAddToDeck || onAddToWishlist) && (
            <div className="card-detail-actions">
              {onAddToDeck && (
                <button className="btn" onClick={() => {
                  onAddToDeck(card);
                  if (onClose) onClose();
                }}>
                  Add to Deck
                </button>
              )}
              {onAddToWishlist && (
                <button 
                  className={`btn ${isWishlisted ? 'btn-wishlist-active' : 'btn-secondary'}`}
                  onClick={() => {
                    onAddToWishlist(card);
                    if (onClose) onClose();
                  }}
                >
                  {isWishlisted ? '⭐ Remove from Wishlist' : '☆ Add to Wishlist'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {comboCardDetail && (
        <CardDetail
          card={comboCardDetail}
          deckCards={deckCards}
          onAddToDeck={onAddToDeck}
          onAddToWishlist={onAddToWishlist}
          isWishlisted={deckCards.some(dc => dc.id === comboCardDetail.id)}
          onClose={() => setComboCardDetail(null)}
        />
      )}
    </div>
  );
}
