import type { Deck, DeckCard, Card } from '../types';
import { DeckValidator } from '../utils/deckValidation';
import { ComboAnalyzer } from './combos';
import { CollectionService } from '../utils/collection';
import { ScryfallService } from './scryfall';

export interface SynergyAnalysis {
  card: Card;
  synergies: Array<{
    cardName: string;
    reason: string;
    synergy: 'high' | 'medium' | 'low';
  }>;
  overallSynergy: 'high' | 'medium' | 'low';
}

export interface StrategyAnalysis {
  archetype: string;
  strategy: string;
  strengths: string[];
  weaknesses: string[];
  manaCurve: Array<{ cmc: number; count: number }>;
  colorDistribution: { [color: string]: number };
  keyMechanics: string[];
}

export interface CollectionImprovement {
  card: Card;
  reason: string;
  currentCard?: Card;
  priority: 'high' | 'medium' | 'low';
}

export interface PurchaseRecommendation {
  card: Card;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedPrice?: string;
}

export interface WinCondition {
  type: 'combat' | 'burn' | 'combo' | 'mill' | 'alternative' | 'control' | 'tokens' | 'drain' | 'poison' | 'unknown';
  name: string;
  description: string;
  cards: Card[];
  confidence: 'high' | 'medium' | 'low';
  gameplan: string[];
  keyCards: Card[];
}

export interface DeckAnalysisResult {
  legality: {
    isValid: boolean;
    format: string;
    errors: string[];
    warnings: string[];
  };
  synergies: SynergyAnalysis[];
  strategy: StrategyAnalysis;
  winConditions: WinCondition[];
  collectionImprovements: CollectionImprovement[];
  purchaseRecommendations: PurchaseRecommendation[];
}

export class DeckAnalysisService {
  static async analyzeDeck(deck: Deck, format: string = 'standard'): Promise<DeckAnalysisResult> {
    // 1. Check legality
    const validation = DeckValidator.validate(deck, format);
    
    // 2. Analyze synergies
    const synergies = await this.analyzeSynergies(deck);
    
    // 3. Generate strategy writeup
    const strategy = this.analyzeStrategy(deck);
    
    // 4. Analyze win conditions
    const winConditions = this.analyzeWinConditions(deck);
    
    // 5. Check collection for improvements
    const collectionImprovements = await this.findCollectionImprovements(deck);
    
    // 6. Recommend cards to buy
    const purchaseRecommendations = await this.generatePurchaseRecommendations(deck, strategy, synergies);
    
    return {
      legality: {
        isValid: validation.isValid,
        format,
        errors: validation.errors,
        warnings: validation.warnings
      },
      synergies,
      strategy,
      winConditions,
      collectionImprovements,
      purchaseRecommendations
    };
  }

  private static async analyzeSynergies(deck: Deck): Promise<SynergyAnalysis[]> {
    const allCards = [...deck.cards, ...deck.sideboard].map(dc => dc.card);
    const synergies: SynergyAnalysis[] = [];
    
    for (const deckCard of deck.cards) {
      const card = deckCard.card;
      const cardCombos = await ComboAnalyzer.findCombos(card, allCards);
      
      // Calculate overall synergy level
      const highCount = cardCombos.filter(c => c.synergy === 'high').length;
      const mediumCount = cardCombos.filter(c => c.synergy === 'medium').length;
      
      let overallSynergy: 'high' | 'medium' | 'low' = 'low';
      if (highCount >= 2 || (highCount >= 1 && mediumCount >= 2)) {
        overallSynergy = 'high';
      } else if (highCount >= 1 || mediumCount >= 2) {
        overallSynergy = 'medium';
      }
      
      synergies.push({
        card,
        synergies: cardCombos,
        overallSynergy
      });
    }
    
    return synergies.sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return order[b.overallSynergy] - order[a.overallSynergy];
    });
  }

  private static analyzeStrategy(deck: Deck): StrategyAnalysis {
    const allCards = [...deck.cards, ...deck.sideboard].map(dc => dc.card);
    const manaCurve = DeckValidator.calculateManaCurve(deck.cards);
    const colorDistribution = this.getColorDistribution(deck.cards);
    const keyMechanics = this.identifyKeyMechanics(allCards);
    const archetype = this.determineArchetype(allCards, manaCurve, colorDistribution, keyMechanics);
    
    const strategy = this.generateStrategyText(archetype, allCards, manaCurve, colorDistribution, keyMechanics);
    const strengths = this.identifyStrengths(archetype, allCards, manaCurve, keyMechanics);
    const weaknesses = this.identifyWeaknesses(archetype, allCards, manaCurve, keyMechanics, deck.cards);
    
    return {
      archetype,
      strategy,
      strengths,
      weaknesses,
      manaCurve,
      colorDistribution,
      keyMechanics
    };
  }

  private static getColorDistribution(cards: DeckCard[]): { [color: string]: number } {
    const distribution: { [color: string]: number } = {
      'W': 0, 'U': 0, 'B': 0, 'R': 0, 'G': 0, 'C': 0
    };
    
    for (const deckCard of cards) {
      for (const color of deckCard.card.color_identity || []) {
        distribution[color] = (distribution[color] || 0) + deckCard.quantity;
      }
    }
    
    return distribution;
  }

  private static identifyKeyMechanics(cards: Card[]): string[] {
    const mechanics: { [key: string]: number } = {};
    const mechanicKeywords: { [key: string]: string[] } = {
      'Aggro': ['haste', 'trample', 'menace', 'damage', 'attack'],
      'Control': ['counter', 'destroy', 'exile', 'draw', 'removal'],
      'Combo': ['whenever', 'when', 'trigger', 'synergy', 'combo'],
      'Midrange': ['creature', 'value', 'card advantage', 'threat'],
      'Ramp': ['mana', 'land', 'add', 'ritual', 'dork'],
      'Burn': ['damage', 'lightning', 'shock', 'bolt', 'direct damage'],
      'Tribal': ['zombie', 'elf', 'goblin', 'human', 'wizard', 'warrior', 'dragon'],
      'Reanimator': ['graveyard', 'reanimate', 'return', 'discard'],
      'Tokens': ['token', 'create', 'generate', 'populate'],
      'Lifegain': ['life', 'gain', 'lifelink', 'heal']
    };
    
    for (const card of cards) {
      const oracleText = (card.oracle_text || '').toLowerCase();
      const typeLine = (card.type_line || '').toLowerCase();
      
      for (const [mechanic, keywords] of Object.entries(mechanicKeywords)) {
        const matches = keywords.filter(kw => 
          oracleText.includes(kw) || typeLine.includes(kw)
        ).length;
        
        if (matches > 0) {
          mechanics[mechanic] = (mechanics[mechanic] || 0) + matches;
        }
      }
    }
    
    // Return top 3-5 mechanics
    return Object.entries(mechanics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mechanic]) => mechanic);
  }

  private static determineArchetype(
    _cards: Card[],
    manaCurve: Array<{ cmc: number; count: number }>,
    _colorDistribution: { [color: string]: number },
    keyMechanics: string[]
  ): string {
    const avgCMC = manaCurve.reduce((sum, mc) => sum + (mc.cmc * mc.count), 0) / 
                   manaCurve.reduce((sum, mc) => sum + mc.count, 0);
    const lowCostCount = manaCurve.filter(mc => mc.cmc <= 2).reduce((sum, mc) => sum + mc.count, 0);
    const highCostCount = manaCurve.filter(mc => mc.cmc >= 5).reduce((sum, mc) => sum + mc.count, 0);
    const totalCards = manaCurve.reduce((sum, mc) => sum + mc.count, 0);
    
    // Determine primary archetype
    if (keyMechanics.includes('Aggro') || (avgCMC < 2.5 && lowCostCount > totalCards * 0.4)) {
      return 'Aggro';
    }
    if (keyMechanics.includes('Control') || (avgCMC > 3.5 && highCostCount > totalCards * 0.2)) {
      return 'Control';
    }
    if (keyMechanics.includes('Combo')) {
      return 'Combo';
    }
    if (keyMechanics.includes('Ramp') || highCostCount > totalCards * 0.15) {
      return 'Ramp/Midrange';
    }
    if (keyMechanics.includes('Burn')) {
      return 'Burn';
    }
    if (keyMechanics.some(m => ['Tribal', 'Tokens'].includes(m))) {
      return keyMechanics.find(m => ['Tribal', 'Tokens'].includes(m)) || 'Midrange';
    }
    
    return 'Midrange';
  }

  private static generateStrategyText(
    archetype: string,
    _cards: Card[],
    manaCurve: Array<{ cmc: number; count: number }>,
    colorDistribution: { [color: string]: number },
    keyMechanics: string[]
  ): string {
    const colors = Object.entries(colorDistribution)
      .filter(([_, count]) => count > 0)
      .map(([color]) => color)
      .join('');
    
    const avgCMC = manaCurve.reduce((sum, mc) => sum + (mc.cmc * mc.count), 0) / 
                   manaCurve.reduce((sum, mc) => sum + mc.count, 0);
    
    let strategy = `This ${colors || 'Colorless'} ${archetype} deck `;
    
    switch (archetype) {
      case 'Aggro':
        strategy += `focuses on applying early pressure with low-cost creatures and burn spells. `;
        strategy += `With an average CMC of ${avgCMC.toFixed(1)}, the deck aims to win quickly before opponents can stabilize. `;
        strategy += `Key mechanics include ${keyMechanics.slice(0, 3).join(', ')}.`;
        break;
      case 'Control':
        strategy += `aims to control the game through removal, counterspells, and card advantage. `;
        strategy += `The higher average CMC (${avgCMC.toFixed(1)}) allows for powerful late-game finishers. `;
        strategy += `The deck focuses on ${keyMechanics.slice(0, 2).join(' and ')} to maintain board control.`;
        break;
      case 'Combo':
        strategy += `seeks to assemble specific card combinations for game-winning plays. `;
        strategy += `The deck includes ${keyMechanics.slice(0, 2).join(' and ')} mechanics to enable combo execution.`;
        break;
      case 'Ramp/Midrange':
        strategy += `uses mana acceleration to deploy powerful threats ahead of curve. `;
        strategy += `With access to ${keyMechanics.slice(0, 2).join(' and ')}, the deck can outvalue opponents in longer games.`;
        break;
      case 'Burn':
        strategy += `focuses on dealing direct damage to quickly reduce opponent life totals. `;
        strategy += `The deck prioritizes efficiency and speed over card advantage.`;
        break;
      default:
        strategy += `employs a balanced approach with ${keyMechanics.slice(0, 2).join(' and ')} elements. `;
        strategy += `The deck can adapt to different game states with its flexible curve.`;
    }
    
    return strategy;
  }

  private static identifyStrengths(
    archetype: string,
    cards: Card[],
    manaCurve: Array<{ cmc: number; count: number }>,
    keyMechanics: string[]
  ): string[] {
    const strengths: string[] = [];
    const avgCMC = manaCurve.reduce((sum, mc) => sum + (mc.cmc * mc.count), 0) / 
                   manaCurve.reduce((sum, mc) => sum + mc.count, 0);
    
    if (archetype === 'Aggro' && avgCMC < 2.5) {
      strengths.push('Fast, aggressive curve allows for early pressure');
    }
    if (archetype === 'Control' && avgCMC > 3.5) {
      strengths.push('Powerful late-game threats and answers');
    }
    if (keyMechanics.length >= 3) {
      strengths.push(`Multiple synergistic mechanics: ${keyMechanics.slice(0, 3).join(', ')}`);
    }
    
    const removalCount = cards.filter(c => 
      (c.oracle_text || '').toLowerCase().includes('destroy') ||
      (c.oracle_text || '').toLowerCase().includes('exile')
    ).length;
    if (removalCount >= 6) {
      strengths.push('Good removal suite for handling threats');
    }
    
    const cardDrawCount = cards.filter(c => 
      (c.oracle_text || '').toLowerCase().includes('draw')
    ).length;
    if (cardDrawCount >= 4) {
      strengths.push('Card draw ensures consistent resources');
    }
    
    return strengths.length > 0 ? strengths : ['Balanced deck composition'];
  }

  private static identifyWeaknesses(
    archetype: string,
    _cards: Card[],
    manaCurve: Array<{ cmc: number; count: number }>,
    _keyMechanics: string[],
    deckCards: DeckCard[]
  ): string[] {
    const weaknesses: string[] = [];
    const avgCMC = manaCurve.reduce((sum, mc) => sum + (mc.cmc * mc.count), 0) / 
                   manaCurve.reduce((sum, mc) => sum + mc.count, 0);
    
    if (archetype === 'Aggro' && avgCMC > 3.0) {
      weaknesses.push('Curve may be too high for aggressive strategy');
    }
    if (archetype === 'Control' && avgCMC < 2.5) {
      weaknesses.push('May lack late-game power for control strategy');
    }
    
    const landCount = DeckValidator.getLandCount(deckCards);
    const totalCards = DeckValidator.getTotalCount(deckCards);
    const landRatio = landCount / totalCards;
    if (landRatio < 0.35) {
      weaknesses.push('Low land count may cause mana issues');
    } else if (landRatio > 0.45) {
      weaknesses.push('High land count may reduce threat density');
    }
    
    const colorDistribution = this.getColorDistribution(deckCards);
    const colorCount = Object.keys(colorDistribution)
      .filter(c => colorDistribution[c] > 0).length;
    if (colorCount > 3) {
      weaknesses.push('Multiple colors may cause mana consistency issues');
    }
    
    return weaknesses.length > 0 ? weaknesses : ['No major weaknesses identified'];
  }

  private static analyzeWinConditions(deck: Deck): WinCondition[] {
    const allCards = [...deck.cards, ...deck.sideboard].map(dc => dc.card);
    const winConditions: WinCondition[] = [];
    
    // 1. Alternative Win Conditions (cards that say "you win the game")
    const altWinCards = allCards.filter(card => {
      const text = (card.oracle_text || '').toLowerCase();
      return text.includes('you win the game') || text.includes('you win');
    });
    
    if (altWinCards.length > 0) {
      const gameplan: string[] = [];
      for (const card of altWinCards) {
        const text = (card.oracle_text || '').toLowerCase();
        if (text.includes('poison')) {
          gameplan.push(`Get opponent to 10 poison counters using ${card.name} and poison/infect creatures`);
        } else if (text.includes('mill') || text.includes('library')) {
          gameplan.push(`Mill opponent's entire library using ${card.name}`);
        } else if (text.includes('life') && text.includes('40')) {
          gameplan.push(`Reach 40+ life to trigger ${card.name}'s win condition`);
        } else {
          gameplan.push(`Meet ${card.name}'s specific win condition requirements`);
        }
      }
      
      winConditions.push({
        type: 'alternative',
        name: 'Alternative Win Condition',
        description: `Deck contains ${altWinCards.length} card(s) with alternative win conditions: ${altWinCards.map(c => c.name).join(', ')}`,
        cards: altWinCards,
        confidence: altWinCards.length >= 2 ? 'high' : 'medium',
        gameplan,
        keyCards: altWinCards
      });
    }
    
    // 2. Burn/Direct Damage
    const burnCards = allCards.filter(card => {
      const text = (card.oracle_text || '').toLowerCase();
      const name = (card.name || '').toLowerCase();
      return (
        text.includes('deals') && text.includes('damage') && !text.includes('combat') ||
        text.includes('direct damage') ||
        name.includes('bolt') || name.includes('shock') || name.includes('lightning') ||
        (text.includes('damage') && card.type_line?.toLowerCase().includes('instant')) ||
        (text.includes('damage') && card.type_line?.toLowerCase().includes('sorcery'))
      );
    });
    
    const totalBurnPotential = burnCards.reduce((sum, card) => {
      const text = (card.oracle_text || '').toLowerCase();
      const damageMatch = text.match(/(\d+)\s+damage/);
      if (damageMatch) {
        return sum + parseInt(damageMatch[1]);
      }
      return sum + 3; // Default estimate
    }, 0);
    
    if (burnCards.length >= 8 || totalBurnPotential >= 20) {
      winConditions.push({
        type: 'burn',
        name: 'Burn/Direct Damage',
        description: `Deck has ${burnCards.length} burn spells capable of dealing ~${totalBurnPotential} damage`,
        cards: burnCards,
        confidence: burnCards.length >= 12 ? 'high' : burnCards.length >= 8 ? 'medium' : 'low',
        gameplan: [
          'Use burn spells to control early threats',
          'Save burn for direct damage to opponent when possible',
          'Aim to deal 20 damage through burn spells',
          'Use burn to finish opponent after establishing board presence'
        ],
        keyCards: burnCards.slice(0, 5)
      });
    }
    
    // 3. Combat Damage (Aggressive creatures)
    const aggressiveCreatures = allCards.filter(card => {
      const typeLine = (card.type_line || '').toLowerCase();
      if (!typeLine.includes('creature')) return false;
      
      const text = (card.oracle_text || '').toLowerCase();
      const power = parseInt(card.power || '0');
      const cmc = card.cmc || 0;
      
      return (
        (power >= 3 && cmc <= 3) || // Efficient beaters
        text.includes('haste') ||
        text.includes('trample') ||
        text.includes('menace') ||
        (power >= 5 && cmc <= 5) // Big threats
      );
    });
    
    const totalPower = aggressiveCreatures.reduce((sum, card) => {
      const power = parseInt(card.power || '0');
      return sum + power;
    }, 0);
    
    if (aggressiveCreatures.length >= 12) {
      winConditions.push({
        type: 'combat',
        name: 'Combat Damage',
        description: `Deck has ${aggressiveCreatures.length} aggressive creatures with total power ~${totalPower}`,
        cards: aggressiveCreatures,
        confidence: aggressiveCreatures.length >= 20 ? 'high' : aggressiveCreatures.length >= 15 ? 'medium' : 'low',
        gameplan: [
          'Play efficient creatures early to establish board presence',
          'Use removal to clear the way for attacks',
          'Apply pressure each turn to reduce opponent life total',
          'Use combat tricks and pump spells to push through damage',
          'Finish with large threats or evasive creatures'
        ],
        keyCards: aggressiveCreatures
          .sort((a, b) => {
            const aPower = parseInt(a.power || '0');
            const bPower = parseInt(b.power || '0');
            return bPower - aPower;
          })
          .slice(0, 5)
      });
    }
    
    // 4. Mill
    const millCards = allCards.filter(card => {
      const text = (card.oracle_text || '').toLowerCase();
      return (
        text.includes('mill') ||
        text.includes('put') && text.includes('graveyard') && text.includes('library') ||
        text.includes('target player puts') && text.includes('graveyard')
      );
    });
    
    if (millCards.length >= 4) {
      winConditions.push({
        type: 'mill',
        name: 'Mill',
        description: `Deck has ${millCards.length} mill effects to deck the opponent`,
        cards: millCards,
        confidence: millCards.length >= 8 ? 'high' : millCards.length >= 6 ? 'medium' : 'low',
        gameplan: [
          'Use mill effects consistently each turn',
          'Protect yourself while milling opponent',
          'Use graveyard hate if opponent tries to use their graveyard',
          'Aim to mill opponent\'s entire library (typically 53-60 cards)',
          'Combine multiple mill effects for faster wins'
        ],
        keyCards: millCards
      });
    }
    
    // 5. Combo
    const comboIndicators = allCards.filter(card => {
      const text = (card.oracle_text || '').toLowerCase();
      return (
        text.includes('infinite') ||
        text.includes('untap') && text.includes('target') ||
        text.includes('copy') && text.includes('spell') ||
        text.includes('whenever') && text.includes('you may') ||
        (text.includes('draw') && text.includes('card') && text.includes('whenever'))
      );
    });
    
    // Check for known combo patterns
    const hasInfiniteMana = allCards.some(card => {
      const text = (card.oracle_text || '').toLowerCase();
      return text.includes('add') && text.includes('mana') && text.includes('untap');
    });
    
    const hasTutor = allCards.some(card => {
      const text = (card.oracle_text || '').toLowerCase();
      return text.includes('search') && text.includes('library');
    });
    
    if (comboIndicators.length >= 3 || (hasInfiniteMana && hasTutor)) {
      winConditions.push({
        type: 'combo',
        name: 'Combo',
        description: `Deck contains combo pieces: ${comboIndicators.length} potential combo cards`,
        cards: comboIndicators,
        confidence: (hasInfiniteMana && hasTutor) ? 'high' : comboIndicators.length >= 5 ? 'medium' : 'low',
        gameplan: [
          'Assemble combo pieces in hand',
          'Use tutors to find missing pieces',
          'Protect combo with counterspells or protection',
          'Execute combo when safe to do so',
          'Have backup plan if combo is disrupted'
        ],
        keyCards: comboIndicators
      });
    }
    
    // 6. Control Finisher (Large threats for control decks)
    const controlFinishers = allCards.filter(card => {
      const typeLine = (card.type_line || '').toLowerCase();
      const cmc = card.cmc || 0;
      const text = (card.oracle_text || '').toLowerCase();
      
      return (
        (typeLine.includes('planeswalker') && cmc >= 4) ||
        (typeLine.includes('creature') && cmc >= 6) ||
        (typeLine.includes('creature') && text.includes('hexproof') && cmc >= 4) ||
        (text.includes('you win') || text.includes('emblem'))
      );
    });
    
    const hasControlElements = allCards.filter(card => {
      const text = (card.oracle_text || '').toLowerCase();
      return text.includes('counter') || text.includes('destroy') || text.includes('exile');
    }).length >= 8;
    
    if (controlFinishers.length >= 2 && hasControlElements) {
      winConditions.push({
        type: 'control',
        name: 'Control Finisher',
        description: `Deck uses ${controlFinishers.length} finishers after establishing control`,
        cards: controlFinishers,
        confidence: controlFinishers.length >= 3 ? 'high' : 'medium',
        gameplan: [
          'Use removal and counterspells to control the board',
          'Draw cards to maintain card advantage',
          'Survive until you can deploy finishers safely',
          'Protect finishers with counterspells and removal',
          'Win through repeated attacks or planeswalker ultimates'
        ],
        keyCards: controlFinishers
      });
    }
    
    // 7. Token Swarm
    const tokenGenerators = allCards.filter(card => {
      const text = (card.oracle_text || '').toLowerCase();
      return (
        text.includes('create') && text.includes('token') ||
        text.includes('put') && text.includes('token') ||
        text.includes('token') && (text.includes('creature') || text.includes('each'))
      );
    });
    
    if (tokenGenerators.length >= 4) {
      winConditions.push({
        type: 'tokens',
        name: 'Token Swarm',
        description: `Deck generates tokens through ${tokenGenerators.length} token-producing cards`,
        cards: tokenGenerators,
        confidence: tokenGenerators.length >= 6 ? 'high' : 'medium',
        gameplan: [
          'Generate tokens consistently each turn',
          'Use anthems and pump effects to make tokens threatening',
          'Protect token generators from removal',
          'Overwhelm opponent with large numbers of tokens',
          'Use tokens for both offense and defense'
        ],
        keyCards: tokenGenerators
      });
    }
    
    // 8. Life Drain
    const drainEffects = allCards.filter(card => {
      const text = (card.oracle_text || '').toLowerCase();
      return (
        text.includes('lose') && text.includes('life') ||
        text.includes('drain') ||
        (text.includes('damage') && text.includes('gain') && text.includes('life'))
      );
    });
    
    if (drainEffects.length >= 3) {
      winConditions.push({
        type: 'drain',
        name: 'Life Drain',
        description: `Deck uses ${drainEffects.length} drain effects to reduce opponent life while gaining life`,
        cards: drainEffects,
        confidence: drainEffects.length >= 5 ? 'high' : 'medium',
        gameplan: [
          'Use drain effects to chip away at opponent life',
          'Gain life to stay ahead in the race',
          'Combine multiple drain effects for larger life swings',
          'Protect yourself while draining',
          'Finish with a large drain effect or repeated small drains'
        ],
        keyCards: drainEffects
      });
    }
    
    // 9. Poison/Infect
    const poisonCards = allCards.filter(card => {
      const text = (card.oracle_text || '').toLowerCase();
      const name = (card.name || '').toLowerCase();
      return (
        text.includes('poison') ||
        text.includes('infect') ||
        name.includes('infect') ||
        text.includes('poison counter')
      );
    });
    
    if (poisonCards.length >= 4) {
      winConditions.push({
        type: 'poison',
        name: 'Poison/Infect',
        description: `Deck wins by giving opponent 10 poison counters through ${poisonCards.length} poison/infect cards`,
        cards: poisonCards,
        confidence: poisonCards.length >= 8 ? 'high' : 'medium',
        gameplan: [
          'Deploy infect creatures early',
          'Use pump spells to make infect creatures lethal quickly',
          'Protect infect creatures from removal',
          'Aim to deal 10 poison damage (not 20 regular damage)',
          'Use evasion to get poison damage through'
        ],
        keyCards: poisonCards
      });
    }
    
    // If no win conditions found, add a generic one
    if (winConditions.length === 0) {
      winConditions.push({
        type: 'unknown',
        name: 'General Strategy',
        description: 'Deck appears to use a general strategy without a clearly defined win condition',
        cards: allCards.slice(0, 10),
        confidence: 'low',
        gameplan: [
          'Establish board presence with creatures',
          'Use removal to control opponent threats',
          'Apply pressure through combat',
          'Win through incremental advantage'
        ],
        keyCards: allCards
          .filter(c => c.type_line?.toLowerCase().includes('creature'))
          .slice(0, 5)
      });
    }
    
    // Sort by confidence
    return winConditions.sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return order[b.confidence] - order[a.confidence];
    });
  }

  private static async findCollectionImprovements(deck: Deck): Promise<CollectionImprovement[]> {
    const improvements: CollectionImprovement[] = [];
    const collection = CollectionService.getBulkCollection();
    const allCards = [...deck.cards, ...deck.sideboard].map(dc => dc.card);
    
    // Find cards in collection that could improve the deck
    for (const collectionCard of collection) {
      const card = await ScryfallService.getCardByName(collectionCard.name);
      if (!card) continue;
      
      // Check if card is already in deck
      const inDeck = allCards.some(dc => dc.name.toLowerCase() === card.name.toLowerCase());
      if (inDeck) continue;
      
      // Analyze if card could improve the deck
      const reason = this.analyzeCardFit(card, allCards);
      if (reason) {
        improvements.push({
          card,
          reason,
          priority: this.determineImprovementPriority(card, allCards, reason)
        });
      }
    }
    
    return improvements
      .sort((a, b) => {
        const order = { high: 3, medium: 2, low: 1 };
        return order[b.priority] - order[a.priority];
      })
      .slice(0, 10);
  }

  private static analyzeCardFit(card: Card, deckCards: Card[]): string | null {
    const deckColors = new Set<string>();
    deckCards.forEach(c => c.color_identity.forEach(col => deckColors.add(col)));
    
    // Check color compatibility
    const cardColors = new Set(card.color_identity || []);
    const hasColorOverlap = [...cardColors].some(c => deckColors.has(c)) || 
                           (cardColors.size === 0 && deckColors.size === 0);
    
    if (!hasColorOverlap && cardColors.size > 0) {
      return null; // Color mismatch
    }
    
    // Check for synergy
    const oracleText = (card.oracle_text || '').toLowerCase();
    const deckText = deckCards.map(c => (c.oracle_text || '').toLowerCase()).join(' ');
    
    if (oracleText.includes('draw') && deckText.includes('whenever you draw')) {
      return 'Synergizes with card draw triggers in deck';
    }
    if (oracleText.includes('token') && deckText.includes('token')) {
      return 'Enhances token strategy';
    }
    if (oracleText.includes('counter') && deckText.includes('counter')) {
      return 'Adds to counter spell suite';
    }
    if (oracleText.includes('destroy') || oracleText.includes('exile')) {
      return 'Provides additional removal';
    }
    if (oracleText.includes('draw a card')) {
      return 'Adds card advantage';
    }
    
    // Check creature type synergy
    const creatureTypes = oracleText.match(/\b(zombie|elf|goblin|human|wizard|warrior|dragon|angel|demon)\w*\b/gi);
    if (creatureTypes) {
      const deckTypes = deckText.match(/\b(zombie|elf|goblin|human|wizard|warrior|dragon|angel|demon)\w*\b/gi);
      if (deckTypes && creatureTypes.some(ct => deckTypes.some(dt => dt.toLowerCase() === ct.toLowerCase()))) {
        return 'Tribal synergy with existing creatures';
      }
    }
    
    return null;
  }

  private static determineImprovementPriority(
    _card: Card,
    _deckCards: Card[],
    reason: string
  ): 'high' | 'medium' | 'low' {
    if (reason.includes('Synergizes') || reason.includes('Tribal')) {
      return 'high';
    }
    if (reason.includes('removal') || reason.includes('card advantage')) {
      return 'medium';
    }
    return 'low';
  }

  private static async generatePurchaseRecommendations(
    deck: Deck,
    strategy: StrategyAnalysis,
    synergies: SynergyAnalysis[]
  ): Promise<PurchaseRecommendation[]> {
    const recommendations: PurchaseRecommendation[] = [];
    const allCards = [...deck.cards, ...deck.sideboard].map(dc => dc.card);
    
    // Find high-synergy cards that aren't in deck
    for (const synergy of synergies.slice(0, 5)) {
      for (const combo of synergy.synergies) {
        if (combo.synergy === 'high' && !allCards.some(c => c.name === combo.cardName)) {
          const card = await ScryfallService.getCardByName(combo.cardName);
          if (card) {
            recommendations.push({
              card,
              reason: combo.reason,
              priority: 'high',
              estimatedPrice: card.prices?.usd
            });
          }
        }
      }
    }
    
    // Recommend cards based on archetype
    const archetypeRecommendations = await this.getArchetypeRecommendations(strategy.archetype, allCards);
    recommendations.push(...archetypeRecommendations);
    
    // Recommend cards to fill gaps
    const gapRecommendations = await this.getGapRecommendations(deck, strategy);
    recommendations.push(...gapRecommendations);
    
    // Remove duplicates and sort
    const unique = new Map<string, PurchaseRecommendation>();
    for (const rec of recommendations) {
      const existing = unique.get(rec.card.name);
      if (!existing || this.getPriorityValue(rec.priority) > this.getPriorityValue(existing.priority)) {
        unique.set(rec.card.name, rec);
      }
    }
    
    return Array.from(unique.values())
      .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority))
      .slice(0, 15);
  }

  private static async getArchetypeRecommendations(
    archetype: string,
    deckCards: Card[]
  ): Promise<PurchaseRecommendation[]> {
    const recommendations: PurchaseRecommendation[] = [];
    const deckCardNames = new Set(deckCards.map(c => c.name.toLowerCase()));
    
    // Common recommendations by archetype
    const commonCards: { [key: string]: string[] } = {
      'Aggro': ['Lightning Bolt', 'Monastery Swiftspear', 'Goblin Guide', 'Bonecrusher Giant'],
      'Control': ['Counterspell', 'Force of Negation', 'Teferi, Hero of Dominaria', 'Supreme Will'],
      'Combo': ['Demonic Tutor', 'Mystical Tutor', 'Enlightened Tutor', 'Grim Tutor'],
      'Ramp/Midrange': ['Cultivate', 'Kodama\'s Reach', 'Rampant Growth', 'Sakura-Tribe Elder'],
      'Burn': ['Lightning Bolt', 'Lava Spike', 'Rift Bolt', 'Skullcrack']
    };
    
    const suggestions = commonCards[archetype] || [];
    for (const cardName of suggestions) {
      if (deckCardNames.has(cardName.toLowerCase())) continue;
      
      const card = await ScryfallService.getCardByName(cardName);
      if (card) {
        recommendations.push({
          card,
          reason: `Common staple for ${archetype} decks`,
          priority: 'medium',
          estimatedPrice: card.prices?.usd
        });
      }
    }
    
    return recommendations;
  }

  private static async getGapRecommendations(
    deck: Deck,
    _strategy: StrategyAnalysis
  ): Promise<PurchaseRecommendation[]> {
    const recommendations: PurchaseRecommendation[] = [];
    const allCards = [...deck.cards, ...deck.sideboard].map(dc => dc.card);
    
    // Check for missing removal
    const removalCount = allCards.filter(c => 
      (c.oracle_text || '').toLowerCase().includes('destroy') ||
      (c.oracle_text || '').toLowerCase().includes('exile')
    ).length;
    
    if (removalCount < 6) {
      const removalCards = ['Path to Exile', 'Fatal Push', 'Abrupt Decay', 'Terminate'];
      for (const cardName of removalCards) {
        if (allCards.some(c => c.name.toLowerCase() === cardName.toLowerCase())) continue;
        const card = await ScryfallService.getCardByName(cardName);
        if (card) {
          recommendations.push({
            card,
            reason: 'Adds needed removal to deck',
            priority: 'medium',
            estimatedPrice: card.prices?.usd
          });
          break; // Just recommend one
        }
      }
    }
    
    // Check for missing card draw
    const drawCount = allCards.filter(c => 
      (c.oracle_text || '').toLowerCase().includes('draw a card')
    ).length;
    
    if (drawCount < 4) {
      const drawCards = ['Opt', 'Serum Visions', 'Brainstorm', 'Ponder'];
      for (const cardName of drawCards) {
        if (allCards.some(c => c.name.toLowerCase() === cardName.toLowerCase())) continue;
        const card = await ScryfallService.getCardByName(cardName);
        if (card) {
          recommendations.push({
            card,
            reason: 'Adds card draw for consistency',
            priority: 'medium',
            estimatedPrice: card.prices?.usd
          });
          break;
        }
      }
    }
    
    return recommendations;
  }

  private static getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    return { high: 3, medium: 2, low: 1 }[priority];
  }
}
