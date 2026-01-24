import type { Card, CardCombo } from '../types';
import { ScryfallService } from './scryfall';

export class ComboAnalyzer {
  private static comboPatterns: { [key: string]: string[] } = {
    'draw': ['card draw', 'library', 'hand'],
    'discard': ['discard', 'graveyard', 'reanimation'],
    'sacrifice': ['sacrifice', 'death trigger', 'token'],
    'counter': ['counter spell', 'protection', 'hexproof'],
    'mana': ['mana ramp', 'mana dork', 'ritual'],
    'tutor': ['search library', 'tutor', 'fetch'],
    'removal': ['destroy', 'exile', 'bounce'],
    'burn': ['damage', 'direct damage', 'lightning'],
    'mill': ['mill', 'graveyard', 'library'],
    'tokens': ['token', 'create', 'generate']
  };

  static async findCombos(card: Card, deckCards: Card[]): Promise<CardCombo[]> {
    const combos: CardCombo[] = [];
    const oracleText = (card.oracle_text || '').toLowerCase();

    // Analyze card text for combo potential
    for (const [mechanic, keywords] of Object.entries(this.comboPatterns)) {
      const hasMechanic = keywords.some(keyword => oracleText.includes(keyword));
      
      if (hasMechanic) {
        // Find cards in deck that synergize
        for (const deckCard of deckCards) {
          if (deckCard.id === card.id) continue;
          
          const deckOracleText = (deckCard.oracle_text || '').toLowerCase();
          const synergy = this.calculateSynergy(oracleText, deckOracleText, mechanic);
          
          if (synergy) {
            combos.push({
              cardName: deckCard.name,
              reason: synergy.reason,
              synergy: synergy.level
            });
          }
        }
      }
    }

    // Specific combo patterns
    combos.push(...this.findSpecificCombos(card, deckCards));

    // Remove duplicates and sort by synergy
    const uniqueCombos = this.deduplicateCombos(combos);
    return uniqueCombos
      .sort((a, b) => {
        const order = { high: 3, medium: 2, low: 1 };
        return order[b.synergy] - order[a.synergy];
      })
      .slice(0, 10);
  }

  private static findSpecificCombos(card: Card, deckCards: Card[]): CardCombo[] {
    const combos: CardCombo[] = [];
    const oracleText = (card.oracle_text || '').toLowerCase();

    // Land synergies
    if (oracleText.includes('land')) {
      for (const deckCard of deckCards) {
        if (deckCard.type_line.toLowerCase().includes('land')) {
          combos.push({
            cardName: deckCard.name,
            reason: 'Works with land-based strategies',
            synergy: 'medium'
          });
        }
      }
    }

    // Creature type synergies
    const creatureTypes = oracleText.match(/\b(zombie|elf|goblin|human|wizard|warrior|dragon|angel|demon|beast|bird|cat|dog|fish|knight|rogue|cleric|shaman|druid|merfolk|vampire|werewolf|spirit|elemental|construct|artifact|enchantment)\w*\b/gi);
    if (creatureTypes) {
      for (const deckCard of deckCards) {
        const deckType = (deckCard.type_line || '').toLowerCase();
        if (creatureTypes.some(type => deckType.includes(type.toLowerCase()))) {
          combos.push({
            cardName: deckCard.name,
            reason: `Shares creature type synergy`,
            synergy: 'high'
          });
        }
      }
    }

    // Mana cost synergies (cheap spells with expensive payoffs)
    if (card.cmc <= 2) {
      const expensiveCards = deckCards.filter(c => c.cmc >= 6);
      for (const expensiveCard of expensiveCards) {
        combos.push({
          cardName: expensiveCard.name,
          reason: 'Low cost enabler for high cost payoff',
          synergy: 'medium'
        });
      }
    }

    // Color synergies
    if (card.colors.length > 0) {
      const sameColorCards = deckCards.filter(c => 
        c.colors.some(color => card.colors.includes(color))
      );
      for (const sameColorCard of sameColorCards.slice(0, 3)) {
        combos.push({
          cardName: sameColorCard.name,
          reason: 'Color synergy',
          synergy: 'low'
        });
      }
    }

    return combos;
  }

  private static calculateSynergy(
    card1Text: string,
    card2Text: string,
    mechanic: string
  ): { reason: string; level: 'high' | 'medium' | 'low' } | null {
    // Draw synergies
    if (mechanic === 'draw') {
      if (card2Text.includes('whenever you draw') || card2Text.includes('draw a card')) {
        return { reason: 'Triggers on card draw', level: 'high' };
      }
      if (card2Text.includes('discard') && card1Text.includes('draw')) {
        return { reason: 'Draw and discard synergy', level: 'medium' };
      }
    }

    // Sacrifice synergies
    if (mechanic === 'sacrifice') {
      if (card2Text.includes('whenever') && card2Text.includes('dies')) {
        return { reason: 'Sacrifice triggers death effects', level: 'high' };
      }
      if (card2Text.includes('token')) {
        return { reason: 'Sacrifice tokens for value', level: 'medium' };
      }
    }

    // Mana synergies
    if (mechanic === 'mana') {
      if (card2Text.includes('x') || card2Text.match(/\bcost\s+\{x\}/i)) {
        return { reason: 'Mana ramp enables X spells', level: 'high' };
      }
      if (card2Text.match(/\bcost\s+\{[0-9]+\}/) && parseInt(card2Text.match(/\bcost\s+\{([0-9]+)\}/)?.[1] || '0') >= 5) {
        return { reason: 'Mana ramp for expensive spells', level: 'medium' };
      }
    }

    // Counter synergies
    if (mechanic === 'counter') {
      if (card2Text.includes('counter target') || card2Text.includes('cannot be countered')) {
        return { reason: 'Counter spell protection', level: 'medium' };
      }
    }

    return null;
  }

  private static deduplicateCombos(combos: CardCombo[]): CardCombo[] {
    const seen = new Set<string>();
    const unique: CardCombo[] = [];

    for (const combo of combos) {
      const key = combo.cardName;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(combo);
      }
    }

    return unique;
  }

  static async getSuggestedCombos(card: Card): Promise<CardCombo[]> {
    // Get related cards from Scryfall
    const relatedCards = await ScryfallService.getRelatedCards(card.name, card.oracle_text);
    
    return relatedCards.slice(0, 5).map(relatedCard => ({
      cardName: relatedCard.name,
      reason: 'Commonly played together',
      synergy: 'medium' as const
    }));
  }
}
