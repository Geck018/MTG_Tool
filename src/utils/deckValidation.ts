import type { Deck, DeckCard } from '../types';

export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class DeckValidator {
  static validate(deck: Deck, format: string = 'standard'): DeckValidationResult {
    const result: DeckValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    const mainDeck = deck.cards;
    const sideboard = deck.sideboard || [];

    // Check deck size
    const mainDeckCount = this.getTotalCount(mainDeck);
    if (mainDeckCount < 60) {
      result.errors.push(`Main deck has ${mainDeckCount} cards. Minimum is 60.`);
      result.isValid = false;
    } else if (mainDeckCount > 60) {
      result.warnings.push(`Main deck has ${mainDeckCount} cards. Standard decks should have exactly 60.`);
    }

    // Check sideboard size
    const sideboardCount = this.getTotalCount(sideboard);
    if (sideboardCount > 15) {
      result.errors.push(`Sideboard has ${sideboardCount} cards. Maximum is 15.`);
      result.isValid = false;
    }

    // Check for 4-of limit (except basic lands)
    const cardCounts = new Map<string, number>();
    for (const deckCard of mainDeck) {
      const name = deckCard.card.name;
      const isBasicLand = this.isBasicLand(deckCard.card);
      const currentCount = cardCounts.get(name) || 0;
      cardCounts.set(name, currentCount + deckCard.quantity);

      if (!isBasicLand && cardCounts.get(name)! > 4) {
        result.errors.push(`${name} appears ${cardCounts.get(name)} times. Maximum is 4.`);
        result.isValid = false;
      }
    }

    // Check mana curve
    const manaCurve = this.calculateManaCurve(mainDeck);
    const highCostCards = manaCurve.filter(c => c.cmc >= 6).length;
    if (highCostCards > 10) {
      result.warnings.push(`Deck has many high-cost cards (6+ CMC). Consider lowering the curve.`);
    }

    // Check color distribution
    const colorDistribution = this.getColorDistribution(mainDeck);
    if (colorDistribution.size > 3) {
      result.warnings.push(`Deck uses ${colorDistribution.size} colors. Consider focusing on fewer colors for consistency.`);
    }

    // Check for format legality
    for (const deckCard of mainDeck) {
      const legalities = deckCard.card.legalities || {};
      const formatLegality = legalities[format.toLowerCase()];
      if (formatLegality === 'banned') {
        result.errors.push(`${deckCard.card.name} is banned in ${format}.`);
        result.isValid = false;
      } else if (formatLegality === 'restricted') {
        if (deckCard.quantity > 1) {
          result.errors.push(`${deckCard.card.name} is restricted in ${format}. You can only have 1 copy.`);
          result.isValid = false;
        }
      }
    }

    // Suggestions
    if (mainDeckCount === 60 && sideboardCount < 15) {
      result.suggestions.push('Consider adding cards to your sideboard (up to 15 cards).');
    }

    const landCount = this.getLandCount(mainDeck);
    const nonLandCount = mainDeckCount - landCount;
    const landRatio = landCount / mainDeckCount;
    
    if (landRatio < 0.35) {
      result.suggestions.push(`You have ${landCount} lands (${(landRatio * 100).toFixed(1)}%). Consider adding more lands.`);
    } else if (landRatio > 0.45) {
      result.suggestions.push(`You have ${landCount} lands (${(landRatio * 100).toFixed(1)}%). Consider reducing lands.`);
    }

    return result;
  }

  static getTotalCount(cards: DeckCard[]): number {
    return cards.reduce((sum, deckCard) => sum + deckCard.quantity, 0);
  }

  static getLandCount(cards: DeckCard[]): number {
    return cards
      .filter(deckCard => 
        deckCard.card.type_line.toLowerCase().includes('land')
      )
      .reduce((sum, deckCard) => sum + deckCard.quantity, 0);
  }

  static calculateManaCurve(cards: DeckCard[]): Array<{ cmc: number; count: number }> {
    const curve: { [cmc: number]: number } = {};
    
    for (const deckCard of cards) {
      const cmc = deckCard.card.cmc || 0;
      curve[cmc] = (curve[cmc] || 0) + deckCard.quantity;
    }

    return Object.entries(curve)
      .map(([cmc, count]) => ({ cmc: parseInt(cmc), count }))
      .sort((a, b) => a.cmc - b.cmc);
  }

  static getColorDistribution(cards: DeckCard[]): Set<string> {
    const colors = new Set<string>();
    
    for (const deckCard of cards) {
      for (const color of deckCard.card.color_identity || []) {
        colors.add(color);
      }
    }

    return colors;
  }

  static isBasicLand(card: Card): boolean {
    const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
    return basicLands.includes(card.name);
  }
}
