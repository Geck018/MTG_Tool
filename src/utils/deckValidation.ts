import type { Deck, DeckCard, Card } from '../types';

export interface FormatRules {
  /** Min cards in main deck */
  mainMin: number;
  /** Max cards in main deck (optional; e.g. 60 for constructed) */
  mainMax: number | null;
  /** Max cards in sideboard (0 = no sideboard) */
  sideboardMax: number;
  /** Max copies per card (except basic lands). 1 = singleton (Commander). */
  maxCopies: number;
  /** If true, only cards with rarity 'common' are allowed (Pauper). */
  pauperOnly?: boolean;
  /** Commander: deck must be exactly mainMin (99 + commander). */
  exactMain?: boolean;
}

/** Format rules: Standard, Modern, Pioneer, Legacy, Vintage = 60/15/4. Commander = 100/0/1 singleton. Pauper = 60/15/4 commons only. */
const FORMAT_RULES: Record<string, FormatRules> = {
  standard:  { mainMin: 60, mainMax: 60, sideboardMax: 15, maxCopies: 4 },
  modern:   { mainMin: 60, mainMax: 60, sideboardMax: 15, maxCopies: 4 },
  pioneer:  { mainMin: 60, mainMax: 60, sideboardMax: 15, maxCopies: 4 },
  legacy:   { mainMin: 60, mainMax: 60, sideboardMax: 15, maxCopies: 4 },
  vintage: { mainMin: 60, mainMax: 60, sideboardMax: 15, maxCopies: 4 },
  pauper:  { mainMin: 60, mainMax: 60, sideboardMax: 15, maxCopies: 4, pauperOnly: true },
  commander: {
    mainMin: 99,
    mainMax: 99,
    sideboardMax: 0,
    maxCopies: 1,
    exactMain: true,
  },
  casual: { mainMin: 1, mainMax: null, sideboardMax: 15, maxCopies: 4 },
};

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
      suggestions: [],
    };

    const formatKey = format.toLowerCase();
    const rules = FORMAT_RULES[formatKey] ?? FORMAT_RULES.standard;
    const mainDeck = deck.cards;
    const sideboard = deck.sideboard || [];

    const mainDeckCount = this.getTotalCount(mainDeck);
    const sideboardCount = this.getTotalCount(sideboard);

    // --- Deck size (format-specific) ---
    if (rules.exactMain) {
      // Commander: exactly 99 in main (commander is separate)
      if (mainDeckCount !== rules.mainMin) {
        result.errors.push(
          `${formatKey === 'commander' ? 'Commander' : 'Main'} deck must have exactly ${rules.mainMin} cards (you have ${mainDeckCount}).`
        );
        result.isValid = false;
      }
    } else {
      if (mainDeckCount < rules.mainMin) {
        result.errors.push(
          `Main deck has ${mainDeckCount} cards. Minimum is ${rules.mainMin}.`
        );
        result.isValid = false;
      }
      if (rules.mainMax !== null && mainDeckCount > rules.mainMax) {
        result.errors.push(
          `Main deck has ${mainDeckCount} cards. Maximum is ${rules.mainMax}.`
        );
        result.isValid = false;
      }
    }

    // --- Sideboard (format-specific) ---
    if (rules.sideboardMax === 0 && sideboardCount > 0) {
      result.errors.push(
        `${formatKey === 'commander' ? 'Commander' : 'This format'} does not use a sideboard (you have ${sideboardCount} sideboard cards).`
      );
      result.isValid = false;
    } else if (rules.sideboardMax > 0 && sideboardCount > rules.sideboardMax) {
      result.errors.push(
        `Sideboard has ${sideboardCount} cards. Maximum is ${rules.sideboardMax}.`
      );
      result.isValid = false;
    }

    // --- Copy limit (4-of or singleton) and basic land exception ---
    const cardCounts = new Map<string, number>();
    for (const deckCard of mainDeck) {
      const name = deckCard.card.name;
      const isBasicLand = this.isBasicLand(deckCard.card);
      const currentCount = cardCounts.get(name) || 0;
      cardCounts.set(name, currentCount + deckCard.quantity);

      if (!isBasicLand && cardCounts.get(name)! > rules.maxCopies) {
        result.errors.push(
          `${name} appears ${cardCounts.get(name)} times. Maximum is ${rules.maxCopies}${rules.maxCopies === 1 ? ' (singleton)' : ''}.`
        );
        result.isValid = false;
      }
    }

    // --- Pauper: commons only ---
    if (rules.pauperOnly) {
      for (const deckCard of mainDeck) {
        const r = (deckCard.card.rarity || '').toLowerCase();
        if (r !== 'common') {
          result.errors.push(
            `${deckCard.card.name} is not common. Pauper allows only commons.`
          );
          result.isValid = false;
        }
      }
      for (const deckCard of sideboard) {
        const r = (deckCard.card.rarity || '').toLowerCase();
        if (r !== 'common') {
          result.errors.push(
            `Sideboard: ${deckCard.card.name} is not common. Pauper allows only commons.`
          );
          result.isValid = false;
        }
      }
    }

    // --- Format legality (banned / restricted) from Scryfall ---
    const checkLegalities = (cards: DeckCard[], zone: string) => {
      for (const deckCard of cards) {
        const legalities = deckCard.card.legalities || {};
        const formatLegality = legalities[formatKey];
        if (formatLegality === 'banned') {
          result.errors.push(
            `${deckCard.card.name} is banned in ${format}.${zone ? ` (${zone})` : ''}`
          );
          result.isValid = false;
        } else if (formatLegality === 'restricted') {
          const total = (mainDeck.concat(sideboard))
            .filter((dc) => dc.card.id === deckCard.card.id)
            .reduce((s, dc) => s + dc.quantity, 0);
          if (total > 1) {
            result.errors.push(
              `${deckCard.card.name} is restricted in ${format}. You may only have 1 copy.`
            );
            result.isValid = false;
          }
        }
        // 'not_legal' = not in format (e.g. old sets in Standard) — treat as error for competitive formats
        if (formatLegality === 'not_legal' && !['casual', 'commander'].includes(formatKey)) {
          result.errors.push(
            `${deckCard.card.name} is not legal in ${format}.`
          );
          result.isValid = false;
        }
      }
    };
    checkLegalities(mainDeck, 'main');
    checkLegalities(sideboard, 'sideboard');

    // --- Warnings (curve, colors) for non-Commander ---
    if (formatKey !== 'commander' && mainDeckCount >= 60) {
      const manaCurve = this.calculateManaCurve(mainDeck);
      const highCostCards = manaCurve.filter((c) => c.cmc >= 6).length;
      if (highCostCards > 10) {
        result.warnings.push(
          'Deck has many high-cost cards (6+ CMC). Consider lowering the curve.'
        );
      }
      const colorDistribution = this.getColorDistribution(mainDeck);
      if (colorDistribution.size > 3) {
        result.warnings.push(
          `Deck uses ${colorDistribution.size} colors. Consider focusing on fewer colors for consistency.`
        );
      }
    }

    // --- Suggestions ---
    if (rules.sideboardMax > 0 && mainDeckCount >= rules.mainMin && sideboardCount < rules.sideboardMax) {
      result.suggestions.push(
        `Consider adding cards to your sideboard (up to ${rules.sideboardMax} cards).`
      );
    }
    if (mainDeckCount >= 40 && formatKey !== 'commander') {
      const landCount = this.getLandCount(mainDeck);
      const landRatio = landCount / mainDeckCount;
      if (landRatio < 0.35) {
        result.suggestions.push(
          `You have ${landCount} lands (${(landRatio * 100).toFixed(1)}%). Consider adding more lands.`
        );
      } else if (landRatio > 0.45) {
        result.suggestions.push(
          `You have ${landCount} lands (${(landRatio * 100).toFixed(1)}%). Consider reducing lands.`
        );
      }
    }

    return result;
  }

  static getTotalCount(cards: DeckCard[]): number {
    return cards.reduce((sum, deckCard) => sum + deckCard.quantity, 0);
  }

  static getLandCount(cards: DeckCard[]): number {
    return cards
      .filter((deckCard) =>
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
      .map(([cmc, count]) => ({ cmc: parseInt(cmc, 10), count }))
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

  /** Get rules for a format (for UI display). */
  static getFormatRules(format: string): FormatRules | null {
    return FORMAT_RULES[format.toLowerCase()] ?? null;
  }
}
