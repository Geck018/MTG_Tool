import { useState, useEffect } from 'react';
import type { Card, CardRuling, CardCombo } from '../types';
import { ScryfallService } from '../services/scryfall';
import { ComboAnalyzer } from '../services/combos';
import { KeywordAnalyzer } from '../services/keywords';

interface CardDetailProps {
  card: Card;
  deckCards?: Card[];
  onAddToDeck?: (card: Card) => void;
  onClose?: () => void;
}

export function CardDetail({ card, deckCards = [], onAddToDeck, onClose }: CardDetailProps) {
  const [rulings, setRulings] = useState<CardRuling[]>([]);
  const [combos, setCombos] = useState<CardCombo[]>([]);
  const [loadingRulings, setLoadingRulings] = useState(false);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [showRulings, setShowRulings] = useState(false);
  const [showCombos, setShowCombos] = useState(false);

  useEffect(() => {
    if (showRulings && rulings.length === 0) {
      loadRulings();
    }
  }, [showRulings]);

  useEffect(() => {
    if (showCombos && combos.length === 0) {
      loadCombos();
    }
  }, [showCombos]);

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
                <span>⚡ Combos & Synergies ({combos.length})</span>
                <span>{showCombos ? '▼' : '▶'}</span>
              </button>
              {showCombos && (
                <div className="card-detail-section-content">
                  {loadingCombos ? (
                    <div className="loading">Analyzing combos...</div>
                  ) : combos.length > 0 ? (
                    <div className="combos-list">
                      {combos.map((combo, i) => (
                        <div key={i} className={`combo-item combo-${combo.synergy}`}>
                          <div className="combo-card">{combo.cardName}</div>
                          <div className="combo-reason">{combo.reason}</div>
                          <div className={`combo-badge combo-${combo.synergy}`}>
                            {combo.synergy.toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No combos found. Try adding cards to your deck first.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {onAddToDeck && (
            <div className="card-detail-actions">
              <button className="btn" onClick={() => onAddToDeck(card)}>
                Add to Deck
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
