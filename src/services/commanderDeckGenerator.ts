import type { Card, DeckCard } from '../types';
import type { BulkCard } from '../types';
import { ScryfallService } from './scryfall';
import { CollectionService } from '../utils/collection';
import { type FormatType } from './deckGenerator';

export interface CommanderDeckOption {
  name: string;
  description: string;
  cards: DeckCard[];
  suggestedCards: Array<{ card: Card; reason: string; priority: 'high' | 'medium' | 'low' }>;
  colorIdentity: string[];
  synergyScore: number;
  strategy: string;
}

export class CommanderDeckGenerator {
  static async generateDeckOptions(commander: Card, format: FormatType = 'commander'): Promise<CommanderDeckOption[] | null> {
    const collection = CollectionService.getBulkCollection();
    if (collection.length === 0) {
      return null;
    }

    // Verify commander is legendary
    const isLegendary = commander.type_line.toLowerCase().includes('legendary');
    if (!isLegendary) {
      return null;
    }

    // Load card data for collection
    const collectionCards: Array<{ bulkCard: BulkCard; card: Card }> = [];
    
    for (const bulkCard of collection) {
      try {
        const card = await ScryfallService.getCardByName(bulkCard.name, bulkCard.set);
        if (card) {
          collectionCards.push({ bulkCard, card });
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error loading ${bulkCard.name}:`, error);
      }
    }

    // Filter cards by commander's color identity
    const commanderColors = commander.color_identity || commander.colors || [];
    const colorIdentity = Array.isArray(commanderColors) ? commanderColors : [];
    
    const colorFilteredCards = collectionCards.filter(({ card }) => {
      const cardColors = card.color_identity || card.colors || [];
      const cardColorArray = Array.isArray(cardColors) ? cardColors : [];
      
      // Include colorless cards and cards within commander's color identity
      if (cardColorArray.length === 0) return true; // Colorless
      
      // Check if all card colors are in commander's color identity
      return cardColorArray.every(c => colorIdentity.includes(c));
    });

    // Analyze commander's abilities to determine strategies
    const strategies = this.analyzeCommanderStrategies(commander);
    
    // Generate deck options for each strategy
    const deckOptions: CommanderDeckOption[] = [];
    
    for (const strategy of strategies) {
      const deck = await this.buildCommanderDeck(
        commander,
        colorFilteredCards,
        strategy,
        format
      );
      
      if (deck && deck.cards.length >= 20) { // Minimum viable deck
        const suggestedCards = await this.findCommanderSuggestions(
          commander,
          deck.cards.map(dc => dc.card),
          strategy,
          format
        );
        
        deckOptions.push({
          name: `${commander.name} - ${strategy.name}`,
          description: strategy.description,
          cards: deck.cards,
          suggestedCards,
          colorIdentity,
          synergyScore: this.calculateCommanderSynergyScore(commander, deck.cards.map(dc => dc.card)),
          strategy: strategy.name
        });
      }
    }

    return deckOptions.length > 0 ? deckOptions : null;
  }

  private static analyzeCommanderStrategies(commander: Card): Array<{ name: string; description: string; keywords: string[] }> {
    const strategies: Array<{ name: string; description: string; keywords: string[] }> = [];
    const oracleText = (commander.oracle_text || '').toLowerCase();
    const typeLine = (commander.type_line || '').toLowerCase();

    // Token strategy
    if (oracleText.includes('create') && oracleText.includes('token') || 
        oracleText.includes('token') && (oracleText.includes('whenever') || oracleText.includes('each'))) {
      strategies.push({
        name: 'Token Swarm',
        description: 'Generate tokens and overwhelm opponents',
        keywords: ['token', 'create', 'whenever', 'generate']
      });
    }

    // Sacrifice strategy
    if (oracleText.includes('sacrifice') || oracleText.includes('when dies') || 
        oracleText.includes('death trigger')) {
      strategies.push({
        name: 'Sacrifice Value',
        description: 'Sacrifice creatures for value and recursion',
        keywords: ['sacrifice', 'when dies', 'death trigger', 'whenever a creature dies']
      });
    }

    // Card draw strategy
    if (oracleText.includes('draw') || oracleText.includes('card advantage')) {
      strategies.push({
        name: 'Card Advantage',
        description: 'Draw cards and maintain card advantage',
        keywords: ['draw', 'card', 'whenever you draw', 'library']
      });
    }

    // Graveyard strategy
    if (oracleText.includes('graveyard') || oracleText.includes('reanimate') || 
        oracleText.includes('flashback') || oracleText.includes('from graveyard')) {
      strategies.push({
        name: 'Graveyard Recursion',
        description: 'Use graveyard as a resource with recursion',
        keywords: ['graveyard', 'reanimate', 'flashback', 'from graveyard', 'return']
      });
    }

    // +1/+1 counters strategy
    if (oracleText.includes('+1/+1') || oracleText.includes('counter') && typeLine.includes('creature')) {
      strategies.push({
        name: 'Counters Matter',
        description: 'Build around +1/+1 counters and proliferate',
        keywords: ['+1/+1', 'counter', 'proliferate', 'whenever a counter']
      });
    }

    // Artifact/Equipment strategy
    if (typeLine.includes('artifact') || oracleText.includes('equipment') || 
        oracleText.includes('equip')) {
      strategies.push({
        name: 'Artifacts & Equipment',
        description: 'Build around artifacts and equipment',
        keywords: ['artifact', 'equipment', 'equip', 'whenever an artifact']
      });
    }

    // Enchantment strategy
    if (typeLine.includes('enchantment') || oracleText.includes('enchantment')) {
      strategies.push({
        name: 'Enchantments',
        description: 'Build around enchantments and auras',
        keywords: ['enchantment', 'aura', 'whenever an enchantment']
      });
    }

    // Aggro strategy (low CMC, combat-focused)
    if (commander.cmc <= 3 && (oracleText.includes('haste') || oracleText.includes('trample') || 
        oracleText.includes('combat'))) {
      strategies.push({
        name: 'Aggressive',
        description: 'Fast, aggressive strategy with early pressure',
        keywords: ['haste', 'trample', 'combat', 'attack', 'damage']
      });
    }

    // Control strategy (high CMC, removal/counters)
    if (commander.cmc >= 5 || oracleText.includes('counter') || oracleText.includes('destroy')) {
      strategies.push({
        name: 'Control',
        description: 'Control the board and win with value',
        keywords: ['counter', 'destroy', 'exile', 'removal', 'control']
      });
    }

    // Default strategy if none match
    if (strategies.length === 0) {
      strategies.push({
        name: 'General Goodstuff',
        description: 'Build a well-rounded deck around the commander',
        keywords: []
      });
    }

    return strategies.slice(0, 3); // Limit to 3 strategies
  }

  private static async buildCommanderDeck(
    commander: Card,
    collectionCards: Array<{ bulkCard: BulkCard; card: Card }>,
    strategy: { name: string; description: string; keywords: string[] },
    _format: FormatType
  ): Promise<{ cards: DeckCard[] } | null> {
    const deckCards: DeckCard[] = [];
    const usedCardIds = new Set<string>();
    
    // Always include commander
    deckCards.push({ card: commander, quantity: 1 });
    usedCardIds.add(commander.id);

    // Score cards by strategy relevance
    const scoredCards = collectionCards
      .filter(({ card }) => {
        // Exclude commander
        if (card.id === commander.id) return false;
        // Exclude other legendary creatures (for now, focus on non-legendary)
        if (card.type_line.toLowerCase().includes('legendary') && 
            card.type_line.toLowerCase().includes('creature')) {
          return false;
        }
        return true;
      })
      .map(({ bulkCard, card }) => {
        let score = 0;
        const oracleText = (card.oracle_text || '').toLowerCase();
        const typeLine = (card.type_line || '').toLowerCase();
        const name = (card.name || '').toLowerCase();

        // Strategy keyword matching
        for (const keyword of strategy.keywords) {
          if (oracleText.includes(keyword.toLowerCase()) || name.includes(keyword.toLowerCase())) {
            score += 5;
          }
        }

        // Color identity match
        const commanderColors = commander.color_identity || commander.colors || [];
        const cardColors = card.color_identity || card.colors || [];
        if (Array.isArray(commanderColors) && Array.isArray(cardColors)) {
          const hasMatchingColor = cardColors.some(c => commanderColors.includes(c));
          if (hasMatchingColor) score += 2;
        }

        // Type synergies
        if (strategy.name.includes('Token') && (oracleText.includes('token') || typeLine.includes('token'))) {
          score += 4;
        }
        if (strategy.name.includes('Artifact') && typeLine.includes('artifact')) {
          score += 4;
        }
        if (strategy.name.includes('Enchantment') && typeLine.includes('enchantment')) {
          score += 4;
        }

        // Mana curve consideration
        if (card.cmc <= 3) score += 1; // Prefer lower CMC
        if (card.cmc >= 7) score -= 1; // Penalize very high CMC

        return { bulkCard, card, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // Target: 99 cards (100 total including commander)
    const targetCards = 99;
    let cardCount = 0;

    // Add non-land cards
    for (const { bulkCard, card } of scoredCards) {
      if (cardCount >= targetCards) break;
      if (card.type_line.toLowerCase().includes('land')) continue;
      if (usedCardIds.has(card.id)) continue;

      const quantity = Math.min(bulkCard.quantity, 1); // Commander format: 1 copy max
      if (quantity > 0) {
        deckCards.push({ card, quantity });
        usedCardIds.add(card.id);
        cardCount += quantity;
      }
    }

    // Add lands (aim for ~36-40 lands in Commander)
    const targetLands = 36;
    const commanderColors = commander.color_identity || commander.colors || [];
    const colorArray = Array.isArray(commanderColors) ? commanderColors : [];
    const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
    const landMap: Record<string, string> = {
      'W': 'Plains',
      'U': 'Island',
      'B': 'Swamp',
      'R': 'Mountain',
      'G': 'Forest'
    };

    let landCount = 0;

    // Add basic lands for each color
    for (const color of colorArray) {
      const landName = landMap[color];
      if (landName) {
        const bulkCard = collectionCards.find(m => m.bulkCard.name === landName);
        if (bulkCard && landCount < targetLands && !usedCardIds.has(bulkCard.card.id)) {
          deckCards.push({ card: bulkCard.card, quantity: 1 });
          usedCardIds.add(bulkCard.card.id);
          landCount++;
        }
      }
    }

    // Add other lands
    for (const { card } of scoredCards) {
      if (landCount >= targetLands) break;
      if (!card.type_line.toLowerCase().includes('land')) continue;
      if (usedCardIds.has(card.id)) continue;
      if (basicLands.includes(card.name)) continue;

      deckCards.push({ card, quantity: 1 });
      usedCardIds.add(card.id);
      landCount++;
    }

    return { cards: deckCards };
  }

  private static async findCommanderSuggestions(
    commander: Card,
    deckCards: Card[],
    strategy: { name: string; description: string; keywords: string[] },
    format: FormatType
  ): Promise<Array<{ card: Card; reason: string; priority: 'high' | 'medium' | 'low' }>> {
    const suggestions: Array<{ card: Card; reason: string; priority: 'high' | 'medium' | 'low' }> = [];
    
    // Search for cards that synergize with commander
    const commanderColors = commander.color_identity || commander.colors || [];
    const colorArray = Array.isArray(commanderColors) ? commanderColors : [];
    
    const searchQueries: string[] = [];
    
    // Search by commander name (find cards that mention or synergize)
    if (commander.name) {
      searchQueries.push(`oracle:"${commander.name}"`);
    }
    
    // Search by strategy keywords
    if (strategy.keywords.length > 0) {
      searchQueries.push(`oracle:${strategy.keywords[0]}`);
    }
    
    // Search by colors
    if (colorArray.length > 0) {
      const colorQuery = colorArray.map(c => `color=${c.toLowerCase()}`).join(' OR ');
      searchQueries.push(colorQuery);
    }

    for (const query of searchQueries.slice(0, 3)) {
      try {
        const results = await ScryfallService.searchCard(query);
        const topResults = (results || [])
          .filter(card => {
            if (!card || !card.id) return false;
            // Check format legality
            const legalities = card.legalities || {};
            const formatLegality = legalities[format.toLowerCase()];
            const isLegal = formatLegality === 'legal' || formatLegality === undefined || formatLegality === null;
            // Check not already in deck
            const notInDeck = !deckCards.some(dc => dc && dc.id === card.id);
            // Check not the commander
            const notCommander = card.id !== commander.id;
            return isLegal && notInDeck && notCommander;
          })
          .slice(0, 5);
        
        for (const card of topResults) {
          if (!card) continue;
          const oracleText = (card.oracle_text || '').toLowerCase();
          const commanderName = (commander.name || '').toLowerCase();
          
          // Check if card mentions commander or strategy
          const mentionsCommander = oracleText.includes(commanderName);
          const matchesStrategy = strategy.keywords.some(k => 
            oracleText.includes((k || '').toLowerCase())
          );
          
          if (mentionsCommander || matchesStrategy) {
            suggestions.push({
              card,
              reason: mentionsCommander 
                ? `Specifically synergizes with ${commander.name}`
                : `Popular ${strategy.name} card for this strategy`,
              priority: card.rarity === 'mythic' || card.rarity === 'rare' ? 'high' : 'medium'
            });
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error('Error searching for commander suggestions:', error);
      }
    }

    // Remove duplicates
    const unique = suggestions.filter((s, i, self) => 
      s && s.card && s.card.id && 
      i === self.findIndex(ss => ss && ss.card && ss.card.id === s.card.id)
    );

    return unique.slice(0, 10);
  }

  private static calculateCommanderSynergyScore(commander: Card, deckCards: Card[]): number {
    if (!deckCards || deckCards.length === 0) return 0;
    
    let score = 0;
    const commanderText = (commander.oracle_text || '').toLowerCase();
    const commanderName = (commander.name || '').toLowerCase();
    
    // Count cards that mention commander or share keywords
    for (const card of deckCards) {
      if (!card || !card.oracle_text) continue;
      const cardText = (card.oracle_text || '').toLowerCase();
      
      if (cardText.includes(commanderName)) {
        score += 5; // Direct synergy
      }
      
      // Check for shared keywords/abilities
      const commanderKeywords = this.extractKeywords(commanderText);
      const cardKeywords = this.extractKeywords(cardText);
      const sharedKeywords = commanderKeywords.filter(k => cardKeywords.includes(k));
      score += sharedKeywords.length;
    }
    
    return Math.min(100, Math.round((score / deckCards.length) * 10));
  }

  private static extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const commonTerms = ['token', 'sacrifice', 'draw', 'graveyard', 'counter', 'destroy', 'exile', 'create', 'whenever', 'when', 'enters', 'dies'];
    
    for (const term of commonTerms) {
      if (text.includes(term)) {
        keywords.push(term);
      }
    }
    
    return keywords;
  }
}
