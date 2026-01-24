import type { Card, DeckCard } from '../types';
import type { BulkCard } from '../types';
import { ScryfallService } from './scryfall';
import { CollectionService } from '../utils/collection';
import { ComboAnalyzer } from './combos';

export type MechanicType = 
  | 'sacrifice'
  | 'lifegain'
  | 'tokens'
  | 'card-draw'
  | 'graveyard'
  | 'burn'
  | 'control'
  | 'ramp'
  | 'aggro'
  | 'combo';

export interface MechanicDefinition {
  id: MechanicType;
  name: string;
  description: string;
  keywords: string[];
  colorPreferences?: string[];
}

export const MECHANICS: MechanicDefinition[] = [
  {
    id: 'sacrifice',
    name: 'Sacrifice',
    description: 'Sacrifice creatures and permanents for value, death triggers, and recursion',
    keywords: ['sacrifice', 'when dies', 'death trigger', 'whenever a creature dies', 'blood', 'flesh'],
    colorPreferences: ['B', 'R']
  },
  {
    id: 'lifegain',
    name: 'Life Gain',
    description: 'Gain life and benefit from life gain triggers',
    keywords: ['gain life', 'lifelink', 'whenever you gain life', 'life total', 'heal'],
    colorPreferences: ['W', 'G']
  },
  {
    id: 'tokens',
    name: 'Token Generation',
    description: 'Create and synergize with tokens',
    keywords: ['create', 'token', 'generate', 'populate', 'whenever a token'],
    colorPreferences: ['W', 'G']
  },
  {
    id: 'card-draw',
    name: 'Card Draw',
    description: 'Draw cards and benefit from draw triggers',
    keywords: ['draw a card', 'draw cards', 'whenever you draw', 'card advantage'],
    colorPreferences: ['U', 'B']
  },
  {
    id: 'graveyard',
    name: 'Graveyard',
    description: 'Use the graveyard as a resource with recursion and reanimation',
    keywords: ['graveyard', 'reanimate', 'flashback', 'dredge', 'unearth', 'from graveyard'],
    colorPreferences: ['B', 'G']
  },
  {
    id: 'burn',
    name: 'Burn',
    description: 'Direct damage spells and aggressive red strategies',
    keywords: ['damage', 'deal damage', 'lightning', 'shock', 'bolt', 'fire'],
    colorPreferences: ['R']
  },
  {
    id: 'control',
    name: 'Control',
    description: 'Counter spells, removal, and board control',
    keywords: ['counter target', 'destroy target', 'exile target', 'bounce', 'removal'],
    colorPreferences: ['U', 'B', 'W']
  },
  {
    id: 'ramp',
    name: 'Mana Ramp',
    description: 'Accelerate mana and play big spells early',
    keywords: ['add mana', 'mana dork', 'land ramp', 'ritual', 'mana source'],
    colorPreferences: ['G', 'R']
  },
  {
    id: 'aggro',
    name: 'Aggro',
    description: 'Fast, aggressive creatures and low-cost threats',
    keywords: ['haste', 'trample', 'menace', 'low cost', 'early game'],
    colorPreferences: ['R', 'W']
  },
  {
    id: 'combo',
    name: 'Combo',
    description: 'Find and execute powerful card combinations',
    keywords: ['whenever', 'trigger', 'synergy', 'infinite', 'engine'],
    colorPreferences: []
  }
];

export interface GeneratedDeck {
  cards: DeckCard[];
  suggestedCards: Array<{ card: Card; reason: string; priority: 'high' | 'medium' | 'low' }>;
  mechanic: MechanicType;
  colorIdentity: string[];
  synergyScore: number;
}

export class DeckGenerator {
  static async generateDeck(mechanic: MechanicType): Promise<GeneratedDeck | null> {
    const collection = CollectionService.getBulkCollection();
    if (collection.length === 0) {
      return null;
    }

    const mechanicDef = MECHANICS.find(m => m.id === mechanic);
    if (!mechanicDef) return null;

    // Load card data for collection
    const collectionCards: Array<{ bulkCard: BulkCard; card: Card }> = [];
    
    for (const bulkCard of collection) {
      try {
        const card = await ScryfallService.getCardByName(bulkCard.name, bulkCard.set);
        if (card) {
          collectionCards.push({ bulkCard, card });
        }
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error loading ${bulkCard.name}:`, error);
      }
    }

    // Filter cards matching the mechanic
    const matchingCards = this.filterCardsByMechanic(collectionCards, mechanicDef);
    
    if (matchingCards.length < 10) {
      return null; // Not enough cards for a deck
    }

    // Analyze synergies
    const synergies = await this.analyzeSynergies(matchingCards.map(m => m.card));
    
    // Build deck (aim for 60 cards: ~24 lands, ~36 non-lands)
    const deck = this.buildDeck(matchingCards, synergies, mechanicDef);
    
    // Find suggested cards to enhance the deck
    const suggestedCards = await this.findSuggestedCards(deck.cards.map(dc => dc.card), mechanicDef);
    
    // Determine color identity
    const colorIdentity = this.getColorIdentity(deck.cards.map(dc => dc.card));
    
    // Calculate synergy score
    const synergyScore = this.calculateSynergyScore(deck.cards.map(dc => dc.card), synergies);

    return {
      cards: deck.cards,
      suggestedCards,
      mechanic,
      colorIdentity,
      synergyScore
    };
  }

  private static filterCardsByMechanic(
    collectionCards: Array<{ bulkCard: BulkCard; card: Card }>,
    mechanic: MechanicDefinition
  ): Array<{ bulkCard: BulkCard; card: Card; score: number }> {
    const results: Array<{ bulkCard: BulkCard; card: Card; score: number }> = [];
    const oracleTextLower = (text: string) => (text || '').toLowerCase();

    for (const { bulkCard, card } of collectionCards) {
      let score = 0;
      const text = oracleTextLower(card.oracle_text || '');
      const typeLine = oracleTextLower(card.type_line || '');
      const name = oracleTextLower(card.name);

      // Check for keyword matches
      for (const keyword of mechanic.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (text.includes(keywordLower) || name.includes(keywordLower)) {
          score += 3;
        }
      }

      // Color preference bonus
      if (mechanic.colorPreferences && mechanic.colorPreferences.length > 0) {
        const cardColors = card.color_identity || card.colors || [];
        const hasPreferredColor = mechanic.colorPreferences.some(c => cardColors.includes(c));
        if (hasPreferredColor) {
          score += 2;
        }
      }

      // Type bonuses for specific mechanics
      if (mechanic.id === 'tokens' && typeLine.includes('token')) {
        score += 5;
      }
      if (mechanic.id === 'aggro' && typeLine.includes('creature') && card.cmc <= 3) {
        score += 2;
      }
      if (mechanic.id === 'ramp' && (typeLine.includes('land') || text.includes('add mana'))) {
        score += 4;
      }
      if (mechanic.id === 'control' && (typeLine.includes('instant') || typeLine.includes('sorcery'))) {
        score += 1;
      }

      if (score > 0) {
        results.push({ bulkCard, card, score });
      }
    }

    // Sort by score and return top matches
    return results.sort((a, b) => b.score - a.score);
  }

  private static async analyzeSynergies(cards: Card[]): Promise<Map<string, Array<{ card: Card; reason: string; level: 'high' | 'medium' | 'low' }>>> {
    const synergies = new Map<string, Array<{ card: Card; reason: string; level: 'high' | 'medium' | 'low' }>>();

    for (const card of cards) {
      const cardSynergies = await ComboAnalyzer.findCombos(card, cards);
      const synergyList = cardSynergies.map(combo => {
        const comboCard = cards.find(c => c.name === combo.cardName);
        return comboCard ? {
          card: comboCard,
          reason: combo.reason,
          level: combo.synergy
        } : null;
      }).filter(Boolean) as Array<{ card: Card; reason: string; level: 'high' | 'medium' | 'low' }>;
      
      if (synergyList.length > 0) {
        synergies.set(card.id, synergyList);
      }
    }

    return synergies;
  }

  private static buildDeck(
    matchingCards: Array<{ bulkCard: BulkCard; card: Card; score: number }>,
    synergies: Map<string, Array<{ card: Card; reason: string; level: 'high' | 'medium' | 'low' }>>,
    _mechanic: MechanicDefinition
  ): { cards: DeckCard[] } {
    const deckCards: DeckCard[] = [];
    const usedCardIds = new Set<string>();
    const cardCounts = new Map<string, number>();
    
    // Target: 36 non-land cards, 24 lands
    const targetNonLands = 36;
    const targetLands = 24;

    // Sort by score and synergy
    const sortedCards = [...matchingCards].sort((a, b) => {
      const aSynergy = synergies.get(a.card.id)?.length || 0;
      const bSynergy = synergies.get(b.card.id)?.length || 0;
      return (b.score + bSynergy * 2) - (a.score + aSynergy * 2);
    });

    // Add non-land cards
    let nonLandCount = 0;
    for (const { bulkCard, card } of sortedCards) {
      if (nonLandCount >= targetNonLands) break;
      if (card.type_line.toLowerCase().includes('land')) continue;
      if (usedCardIds.has(card.id)) continue;

      const quantity = Math.min(bulkCard.quantity, 4); // Max 4 of a card
      if (quantity > 0) {
        deckCards.push({ card, quantity });
        usedCardIds.add(card.id);
        cardCounts.set(card.id, quantity);
        nonLandCount += quantity;
      }
    }

    // Add lands (prioritize basic lands matching color identity)
    const colorIdentity = this.getColorIdentity(deckCards.map(dc => dc.card));
    const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
    const landMap: Record<string, string> = {
      'W': 'Plains',
      'U': 'Island',
      'B': 'Swamp',
      'R': 'Mountain',
      'G': 'Forest'
    };

    let landCount = 0;
    
    // Add basic lands for each color in identity
    for (const color of colorIdentity) {
      const landName = landMap[color];
      if (landName) {
        const bulkCard = matchingCards.find(m => m.bulkCard.name === landName);
        if (bulkCard && landCount < targetLands) {
          const quantity = Math.min(bulkCard.bulkCard.quantity, 8); // Max 8 basics per color
          deckCards.push({ card: bulkCard.card, quantity });
          landCount += quantity;
        }
      }
    }

    // Fill remaining land slots with any available lands
    for (const { bulkCard, card } of sortedCards) {
      if (landCount >= targetLands) break;
      if (!card.type_line.toLowerCase().includes('land')) continue;
      if (usedCardIds.has(card.id)) continue;
      if (basicLands.includes(card.name)) continue; // Already added

      const quantity = Math.min(bulkCard.quantity, 4);
      if (quantity > 0) {
        deckCards.push({ card, quantity });
        usedCardIds.add(card.id);
        landCount += quantity;
      }
    }

    return { cards: deckCards };
  }

  private static async findSuggestedCards(
    deckCards: Card[],
    mechanic: MechanicDefinition
  ): Promise<Array<{ card: Card; reason: string; priority: 'high' | 'medium' | 'low' }>> {
    const suggestions: Array<{ card: Card; reason: string; priority: 'high' | 'medium' | 'low' }> = [];
    
    // Search Scryfall for popular cards matching the mechanic
    const searchQueries = [
      ...mechanic.keywords.slice(0, 2).map(k => `oracle:${k}`),
      ...(mechanic.colorPreferences || []).map(c => `color=${c.toLowerCase()}`)
    ];

    for (const query of searchQueries.slice(0, 3)) {
      try {
        const results = await ScryfallService.searchCard(query);
        const topResults = results
          .filter(card => !deckCards.some(dc => dc.id === card.id))
          .slice(0, 5);
        
        for (const card of topResults) {
          const oracleText = (card.oracle_text || '').toLowerCase();
          const matchesMechanic = mechanic.keywords.some(k => 
            oracleText.includes(k.toLowerCase())
          );
          
          if (matchesMechanic) {
            suggestions.push({
              card,
              reason: `Popular ${mechanic.name} card that synergizes with your deck`,
              priority: card.rarity === 'mythic' || card.rarity === 'rare' ? 'high' : 'medium'
            });
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
      } catch (error) {
        console.error('Error searching for suggestions:', error);
      }
    }

    // Remove duplicates and limit to top 10
    const unique = suggestions.filter((s, i, self) => 
      i === self.findIndex(ss => ss.card.id === s.card.id)
    );

    return unique.slice(0, 10);
  }

  private static getColorIdentity(cards: Card[]): string[] {
    const colors = new Set<string>();
    for (const card of cards) {
      const cardColors = card.color_identity || card.colors || [];
      cardColors.forEach(c => colors.add(c));
    }
    return Array.from(colors).sort();
  }

  private static calculateSynergyScore(cards: Card[], synergies: Map<string, Array<{ card: Card; reason: string; level: 'high' | 'medium' | 'low' }>>): number {
    let score = 0;
    const levelScores = { high: 3, medium: 2, low: 1 };
    
    for (const card of cards) {
      const cardSynergies = synergies.get(card.id) || [];
      score += cardSynergies.reduce((sum, s) => sum + levelScores[s.level], 0);
    }
    
    return Math.min(100, Math.round((score / cards.length) * 10));
  }
}
