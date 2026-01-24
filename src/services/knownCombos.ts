import type { CardCombo } from '../types';

export interface KnownCombo {
  cardName: string;
  comboWith: string[];
  description: string;
  format: string[];
  synergy: 'high' | 'medium' | 'low';
}

// Popular and well-known MTG combos
export const KNOWN_COMBOS: KnownCombo[] = [
  {
    cardName: 'Lightning Bolt',
    comboWith: ['Snapcaster Mage', 'Young Pyromancer', 'Guttersnipe', 'Kiln Fiend'],
    description: 'Works great with spell-synergy creatures and flashback effects',
    format: ['Modern', 'Legacy', 'Vintage'],
    synergy: 'high'
  },
  {
    cardName: 'Snapcaster Mage',
    comboWith: ['Lightning Bolt', 'Counterspell', 'Thoughtseize', 'Path to Exile'],
    description: 'Gives flashback to any instant or sorcery in your graveyard',
    format: ['Modern', 'Legacy', 'Vintage'],
    synergy: 'high'
  },
  {
    cardName: 'Dark Confidant',
    comboWith: ['Liliana of the Veil', 'Thoughtseize', 'Tarmogoyf', 'Deathrite Shaman'],
    description: 'Core of Jund/Abzan midrange - card advantage engine',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  },
  {
    cardName: 'Tarmogoyf',
    comboWith: ['Thoughtseize', 'Lightning Bolt', 'Fatal Push', 'Dark Confidant'],
    description: 'Grows with graveyard - pairs with discard and removal',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  },
  {
    cardName: 'Jace, the Mind Sculptor',
    comboWith: ['Snapcaster Mage', 'Counterspell', 'Brainstorm', 'Force of Will'],
    description: 'Control finisher - works with counterspells and card selection',
    format: ['Legacy', 'Vintage'],
    synergy: 'high'
  },
  {
    cardName: 'Sol Ring',
    comboWith: ['Mana Crypt', 'Mana Vault', 'Grim Monolith', 'Basalt Monolith'],
    description: 'Mana acceleration - pairs with other fast mana',
    format: ['Commander', 'Vintage'],
    synergy: 'high'
  },
  {
    cardName: 'Counterspell',
    comboWith: ['Snapcaster Mage', 'Force of Will', 'Brainstorm', 'Ponder'],
    description: 'Core control piece - pairs with card selection and flashback',
    format: ['Legacy', 'Vintage', 'Pauper'],
    synergy: 'high'
  },
  {
    cardName: 'Thoughtseize',
    comboWith: ['Dark Confidant', 'Liliana of the Veil', 'Tarmogoyf', 'Inquisition of Kozilek'],
    description: 'Hand disruption - core of black midrange strategies',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  },
  {
    cardName: 'Young Pyromancer',
    comboWith: ['Lightning Bolt', 'Ponder', 'Preordain', 'Gitaxian Probe'],
    description: 'Token generator - triggers on instant/sorcery casts',
    format: ['Modern', 'Legacy', 'Pauper'],
    synergy: 'high'
  },
  {
    cardName: 'Goblin Guide',
    comboWith: ['Lightning Bolt', 'Lava Spike', 'Rift Bolt', 'Monastery Swiftspear'],
    description: 'Aggressive red creature - pairs with burn spells',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  },
  {
    cardName: 'Path to Exile',
    comboWith: ['Snapcaster Mage', 'Restoration Angel', 'Wall of Omens'],
    description: 'Efficient removal - pairs with flash creatures and value',
    format: ['Modern', 'Legacy'],
    synergy: 'medium'
  },
  {
    cardName: 'Fatal Push',
    comboWith: ['Thoughtseize', 'Dark Confidant', 'Tarmogoyf', 'Fetch lands'],
    description: 'Efficient removal - triggers revolt with fetch lands',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  },
  {
    cardName: 'Brainstorm',
    comboWith: ['Fetch lands', 'Ponder', 'Preordain', 'Force of Will'],
    description: 'Card selection - best with shuffle effects from fetch lands',
    format: ['Legacy', 'Vintage'],
    synergy: 'high'
  },
  {
    cardName: 'Ponder',
    comboWith: ['Brainstorm', 'Preordain', 'Snapcaster Mage', 'Delver of Secrets'],
    description: 'Card selection - pairs with other cantrips and flashback',
    format: ['Legacy', 'Vintage', 'Pauper'],
    synergy: 'high'
  },
  {
    cardName: 'Delver of Secrets',
    comboWith: ['Ponder', 'Preordain', 'Brainstorm', 'Lightning Bolt'],
    description: 'Aggressive threat - needs instant/sorcery density',
    format: ['Legacy', 'Pauper'],
    synergy: 'high'
  },
  {
    cardName: 'Liliana of the Veil',
    comboWith: ['Thoughtseize', 'Dark Confidant', 'Tarmogoyf', 'Fatal Push'],
    description: 'Control/grind engine - pairs with discard and removal',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  },
  {
    cardName: 'Force of Will',
    comboWith: ['Brainstorm', 'Ponder', 'Counterspell', 'Jace, the Mind Sculptor'],
    description: 'Free counter - pairs with card selection to maintain card advantage',
    format: ['Legacy', 'Vintage'],
    synergy: 'high'
  },
  {
    cardName: 'Swords to Plowshares',
    comboWith: ['Snapcaster Mage', 'Restoration Angel', 'Counterspell'],
    description: 'Efficient removal - pairs with flash creatures and control',
    format: ['Legacy', 'Vintage'],
    synergy: 'medium'
  },
  {
    cardName: 'Birds of Paradise',
    comboWith: ['Noble Hierarch', 'Llanowar Elves', 'Elvish Mystic', 'Mana dorks'],
    description: 'Mana acceleration - pairs with other ramp creatures',
    format: ['Modern', 'Legacy'],
    synergy: 'medium'
  },
  {
    cardName: 'Noble Hierarch',
    comboWith: ['Birds of Paradise', 'Tarmogoyf', 'Knight of the Reliquary'],
    description: 'Mana dork with exalted - pairs with creature strategies',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  },
  {
    cardName: 'Stoneforge Mystic',
    comboWith: ['Batterskull', 'Sword of Fire and Ice', 'Umezawa\'s Jitte'],
    description: 'Tutor for equipment - pairs with powerful artifacts',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  },
  {
    cardName: 'Ragavan, Nimble Pilferer',
    comboWith: ['Lightning Bolt', 'Dragon\'s Rage Channeler', 'Monastery Swiftspear'],
    description: 'Aggressive threat - pairs with red aggro and prowess',
    format: ['Modern', 'Legacy'],
    synergy: 'high'
  }
];

export class KnownComboService {
  static getCombosForCard(cardName: string): KnownCombo[] {
    return KNOWN_COMBOS.filter(combo => 
      combo.cardName.toLowerCase() === cardName.toLowerCase()
    );
  }

  static getCardsThatComboWith(cardName: string): KnownCombo[] {
    return KNOWN_COMBOS.filter(combo =>
      combo.comboWith.some(name => 
        name.toLowerCase() === cardName.toLowerCase()
      )
    );
  }

  static getAllCombosForCard(cardName: string): Array<{ combo: KnownCombo; type: 'primary' | 'secondary' }> {
    const primary = this.getCombosForCard(cardName).map(combo => ({ combo, type: 'primary' as const }));
    const secondary = this.getCardsThatComboWith(cardName).map(combo => ({ combo, type: 'secondary' as const }));
    return [...primary, ...secondary];
  }

  static convertToCardCombo(knownCombo: KnownCombo, type: 'primary' | 'secondary'): CardCombo[] {
    if (type === 'primary') {
      return knownCombo.comboWith.map(cardName => ({
        cardName,
        reason: knownCombo.description,
        synergy: knownCombo.synergy
      }));
    } else {
      return [{
        cardName: knownCombo.cardName,
        reason: `${knownCombo.description} (${knownCombo.cardName} combos with this card)`,
        synergy: knownCombo.synergy
      }];
    }
  }
}
