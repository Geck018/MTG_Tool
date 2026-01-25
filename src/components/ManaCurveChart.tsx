import { useMemo } from 'react';
import type { DeckCard } from '../types';
import { DeckValidator } from '../utils/deckValidation';

interface ManaCurveChartProps {
  cards: DeckCard[];
  title?: string;
}

export function ManaCurveChart({ cards, title = 'Mana Curve' }: ManaCurveChartProps) {
  const manaCurve = useMemo(() => {
    return DeckValidator.calculateManaCurve(cards);
  }, [cards]);

  // Find max count for scaling
  const maxCount = useMemo(() => {
    if (manaCurve.length === 0) return 1;
    return Math.max(...manaCurve.map(item => item.count), 1);
  }, [manaCurve]);

  // Create array for all CMC values from 0 to max
  const maxCMC = useMemo(() => {
    if (manaCurve.length === 0) return 7;
    return Math.max(...manaCurve.map(item => item.cmc), 7);
  }, [manaCurve]);

  const chartData = useMemo(() => {
    const data: Array<{ cmc: number; count: number }> = [];
    for (let i = 0; i <= Math.min(maxCMC, 10); i++) {
      const existing = manaCurve.find(item => item.cmc === i);
      data.push({ cmc: i, count: existing?.count || 0 });
    }
    return data;
  }, [manaCurve, maxCMC]);

  const barHeight = (count: number) => {
    if (maxCount === 0) return 0;
    return (count / maxCount) * 100;
  };

  if (cards.length === 0) {
    return (
      <div className="mana-curve-chart">
        <h3 className="mana-curve-title">{title}</h3>
        <div className="mana-curve-empty">No cards to display</div>
      </div>
    );
  }

  return (
    <div className="mana-curve-chart">
      <h3 className="mana-curve-title">{title}</h3>
      <div className="mana-curve-container">
        <div className="mana-curve-bars">
          {chartData.map(({ cmc, count }) => (
            <div key={cmc} className="mana-curve-bar-group">
              <div className="mana-curve-bar-wrapper">
                <div
                  className="mana-curve-bar"
                  style={{ height: `${barHeight(count)}%` }}
                  title={`CMC ${cmc}: ${count} card${count !== 1 ? 's' : ''}`}
                >
                  {count > 0 && (
                    <span className="mana-curve-count">{count}</span>
                  )}
                </div>
              </div>
              <div className="mana-curve-label">{cmc}</div>
            </div>
          ))}
        </div>
        <div className="mana-curve-stats">
          <div className="mana-curve-stat">
            <span className="stat-label">Total Cards:</span>
            <span className="stat-value">{cards.reduce((sum, dc) => sum + dc.quantity, 0)}</span>
          </div>
          <div className="mana-curve-stat">
            <span className="stat-label">Avg CMC:</span>
            <span className="stat-value">
              {cards.length > 0
                ? (cards.reduce((sum, dc) => sum + (dc.card.cmc || 0) * dc.quantity, 0) /
                    cards.reduce((sum, dc) => sum + dc.quantity, 0)).toFixed(2)
                : '0.00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
