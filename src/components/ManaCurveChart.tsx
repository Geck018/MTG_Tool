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

  // Calculate color distribution for each CMC
  const colorData = useMemo(() => {
    const colorMap: Map<number, Map<string, number>> = new Map();
    
    for (const deckCard of cards) {
      const cmc = deckCard.card.cmc || 0;
      const quantity = deckCard.quantity;
      const cardColors = deckCard.card.colors || deckCard.card.color_identity || [];
      const colorArray = Array.isArray(cardColors) ? cardColors : [];
      
      if (!colorMap.has(cmc)) {
        colorMap.set(cmc, new Map());
      }
      
      const cmcColors = colorMap.get(cmc)!;
      
      if (colorArray.length === 0) {
        // Colorless
        cmcColors.set('C', (cmcColors.get('C') || 0) + quantity);
      } else {
        // Distribute quantity across colors (for multicolor cards)
        for (const color of colorArray) {
          cmcColors.set(color, (cmcColors.get(color) || 0) + quantity);
        }
      }
    }
    
    return colorMap;
  }, [cards]);

  const chartData = useMemo(() => {
    const data: Array<{ cmc: number; count: number; colors: Map<string, number> }> = [];
    for (let i = 0; i <= Math.min(maxCMC, 10); i++) {
      const existing = manaCurve.find(item => item.cmc === i);
      const colors = colorData.get(i) || new Map();
      data.push({ cmc: i, count: existing?.count || 0, colors });
    }
    return data;
  }, [manaCurve, maxCMC, colorData]);

  // Get color gradient for a bar based on color distribution
  const getBarColor = (colors: Map<string, number>, total: number): string => {
    if (total === 0) return 'var(--text-secondary)';
    
    const colorOrder = ['W', 'U', 'B', 'R', 'G', 'C'];
    const colorValues: Record<string, string> = {
      'W': '#f9fafb', // White
      'U': '#3b82f6', // Blue
      'B': '#1f2937', // Black
      'R': '#ef4444', // Red
      'G': '#22c55e', // Green
      'C': '#9ca3af'  // Colorless (gray)
    };
    
    const sortedColors = Array.from(colors.entries())
      .filter(([_, count]) => count > 0)
      .sort((a, b) => {
        const indexA = colorOrder.indexOf(a[0]);
        const indexB = colorOrder.indexOf(b[0]);
        return indexA - indexB;
      });
    
    if (sortedColors.length === 0) {
      return 'var(--accent)';
    }
    
    if (sortedColors.length === 1) {
      return colorValues[sortedColors[0][0]] || 'var(--accent)';
    }
    
    // Multicolor: create gradient
    const percentages = sortedColors.map(([_, count]) => (count / total) * 100);
    const gradientColors = sortedColors.map(([color], index) => 
      `${colorValues[color] || 'var(--accent)'} ${index === 0 ? 0 : percentages.slice(0, index).reduce((a, b) => a + b, 0)}%`
    );
    
    return `linear-gradient(to top, ${gradientColors.join(', ')})`;
  };

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
          {chartData.map(({ cmc, count, colors }) => {
            const colorBreakdown = Array.from(colors.entries())
              .filter(([_, c]) => c > 0)
              .map(([color, c]) => {
                const colorNames: Record<string, string> = {
                  'W': 'White',
                  'U': 'Blue',
                  'B': 'Black',
                  'R': 'Red',
                  'G': 'Green',
                  'C': 'Colorless'
                };
                return `${colorNames[color] || color}: ${c}`;
              })
              .join(', ');
            
            const tooltip = `CMC ${cmc}: ${count} card${count !== 1 ? 's' : ''}${colorBreakdown ? ` (${colorBreakdown})` : ''}`;
            
            return (
              <div key={cmc} className="mana-curve-bar-group">
                <div className="mana-curve-bar-wrapper">
                  <div
                    className="mana-curve-bar"
                    style={{ 
                      height: `${barHeight(count)}%`,
                      background: getBarColor(colors, count)
                    }}
                    title={tooltip}
                  >
                    {count > 0 && (
                      <span className="mana-curve-count">{count}</span>
                    )}
                  </div>
                </div>
                <div className="mana-curve-label">{cmc}</div>
              </div>
            );
          })}
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
