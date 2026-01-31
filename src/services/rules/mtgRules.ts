// MTG Comprehensive Rules - Key sections embedded for search
// Source: Magic: The Gathering Comprehensive Rules
// These are the most commonly referenced rules

export interface Rule {
  id: string;
  number: string;
  title: string;
  text: string;
  keywords: string[];
  category: string;
}

export interface RuleCategory {
  id: string;
  name: string;
  description: string;
}

export const MTG_RULE_CATEGORIES: RuleCategory[] = [
  { id: 'game-concepts', name: 'Game Concepts', description: 'Basic game concepts and definitions' },
  { id: 'parts-of-card', name: 'Parts of a Card', description: 'Card components and characteristics' },
  { id: 'card-types', name: 'Card Types', description: 'Different types of cards and their rules' },
  { id: 'zones', name: 'Zones', description: 'Game zones like library, graveyard, battlefield' },
  { id: 'turn-structure', name: 'Turn Structure', description: 'Phases and steps of a turn' },
  { id: 'spells-abilities', name: 'Spells, Abilities, and Effects', description: 'How spells and abilities work' },
  { id: 'combat', name: 'Combat', description: 'Combat phase rules' },
  { id: 'keywords', name: 'Keyword Abilities', description: 'Keyword ability definitions' },
  { id: 'multiplayer', name: 'Multiplayer', description: 'Multiplayer variant rules' },
];

export const MTG_RULES: Rule[] = [
  // 1. Game Concepts
  {
    id: 'mtg-100.1',
    number: '100.1',
    title: 'The Golden Rule',
    text: 'Whenever a card\'s text directly contradicts these rules, the card takes precedence. The card overrides only the rule that applies to that specific situation. The only exception is that a player can concede the game at any time.',
    keywords: ['golden rule', 'card text', 'override', 'contradiction', 'precedence'],
    category: 'game-concepts'
  },
  {
    id: 'mtg-100.2',
    number: '100.2',
    title: 'Players',
    text: 'A game of Magic is played between two or more players. In most games, each player starts with 20 life. The most common way to win is to reduce your opponents to 0 life.',
    keywords: ['players', 'life', 'life total', '20 life', 'starting life', 'win', 'lose'],
    category: 'game-concepts'
  },
  {
    id: 'mtg-100.6',
    number: '100.6',
    title: 'Deck Construction',
    text: 'Most Magic games use a minimum of sixty cards for the main deck. A sideboard may contain up to fifteen cards. With the exception of basic lands, no more than four copies of any card may be included.',
    keywords: ['deck', 'deck size', '60 cards', 'sideboard', '15 cards', 'four copies', '4 copies', 'basic land', 'deck construction'],
    category: 'game-concepts'
  },
  {
    id: 'mtg-104.1',
    number: '104.1',
    title: 'Winning the Game',
    text: 'A player wins the game if all opponents have lost. Players can lose by having 0 or less life, by drawing from an empty library, by having 10 or more poison counters, or by an effect that says they lose.',
    keywords: ['win', 'lose', 'victory', 'defeat', 'poison counters', 'empty library', 'deck out', 'mill out', '0 life'],
    category: 'game-concepts'
  },
  {
    id: 'mtg-104.3a',
    number: '104.3a',
    title: 'Loss by Life',
    text: 'A player with 0 or less life loses the game. This is a state-based action.',
    keywords: ['life', '0 life', 'lose', 'state-based action', 'death'],
    category: 'game-concepts'
  },
  {
    id: 'mtg-104.3b',
    number: '104.3b',
    title: 'Loss by Drawing',
    text: 'A player who attempts to draw a card from an empty library loses the game. This is a state-based action.',
    keywords: ['draw', 'empty library', 'deck out', 'mill', 'lose', 'state-based action'],
    category: 'game-concepts'
  },
  {
    id: 'mtg-104.3c',
    number: '104.3c',
    title: 'Loss by Poison',
    text: 'A player with ten or more poison counters loses the game. This is a state-based action.',
    keywords: ['poison', 'poison counter', '10 poison', 'infect', 'lose', 'state-based action'],
    category: 'game-concepts'
  },

  // 2. Parts of a Card
  {
    id: 'mtg-201.1',
    number: '201.1',
    title: 'Card Name',
    text: 'The name of a card is printed in its upper left corner. Cards with the same English name are considered the same card.',
    keywords: ['name', 'card name', 'same card', 'identity'],
    category: 'parts-of-card'
  },
  {
    id: 'mtg-202.1',
    number: '202.1',
    title: 'Mana Cost',
    text: 'A card\'s mana cost is indicated by mana symbols in its upper right corner. The mana cost determines how much mana must be paid to cast the spell.',
    keywords: ['mana cost', 'casting cost', 'mana symbols', 'pay mana', 'cast'],
    category: 'parts-of-card'
  },
  {
    id: 'mtg-202.3',
    number: '202.3',
    title: 'Mana Value (CMC)',
    text: 'The mana value of an object is a number equal to the total amount of mana in its mana cost, regardless of color. Previously known as "converted mana cost" or CMC.',
    keywords: ['mana value', 'cmc', 'converted mana cost', 'total mana', 'mana cost'],
    category: 'parts-of-card'
  },
  {
    id: 'mtg-203.1',
    number: '203.1',
    title: 'Color',
    text: 'The colors are white, blue, black, red, and green. An object can be one or more of these colors, or it can be colorless. Color is determined by mana cost or color indicator.',
    keywords: ['color', 'white', 'blue', 'black', 'red', 'green', 'colorless', 'color identity'],
    category: 'parts-of-card'
  },
  {
    id: 'mtg-205.1',
    number: '205.1',
    title: 'Type Line',
    text: 'The type line is printed directly below the illustration. It contains the card\'s card type(s), and may also contain subtypes and supertypes.',
    keywords: ['type line', 'card type', 'subtype', 'supertype', 'creature type'],
    category: 'parts-of-card'
  },

  // 3. Card Types
  {
    id: 'mtg-302.1',
    number: '302.1',
    title: 'Creature',
    text: 'A creature is a permanent. A creature card can be cast only during the main phase when the stack is empty. Creatures can attack and block.',
    keywords: ['creature', 'permanent', 'attack', 'block', 'main phase', 'cast creature'],
    category: 'card-types'
  },
  {
    id: 'mtg-302.6',
    number: '302.6',
    title: 'Summoning Sickness',
    text: 'A creature cannot attack or use abilities with the tap symbol unless it has been under its controller\'s control since the start of their most recent turn. This is called "summoning sickness."',
    keywords: ['summoning sickness', 'haste', 'attack', 'tap', 'control', 'beginning of turn'],
    category: 'card-types'
  },
  {
    id: 'mtg-303.1',
    number: '303.1',
    title: 'Enchantment',
    text: 'An enchantment is a permanent. An enchantment card can be cast only during the main phase when the stack is empty. An enchantment remains on the battlefield indefinitely.',
    keywords: ['enchantment', 'permanent', 'aura', 'main phase', 'cast enchantment'],
    category: 'card-types'
  },
  {
    id: 'mtg-303.4',
    number: '303.4',
    title: 'Aura',
    text: 'An Aura enters the battlefield attached to an object or player. The Aura\'s "enchant" ability restricts what it can be attached to. If the enchanted permanent leaves the battlefield, the Aura is put into its owner\'s graveyard.',
    keywords: ['aura', 'enchant', 'attached', 'enchanted', 'graveyard', 'falls off'],
    category: 'card-types'
  },
  {
    id: 'mtg-304.1',
    number: '304.1',
    title: 'Instant',
    text: 'An instant is a spell that can be cast at almost any time, including during another player\'s turn and while another spell or ability is on the stack.',
    keywords: ['instant', 'spell', 'any time', 'response', 'stack', 'flash'],
    category: 'card-types'
  },
  {
    id: 'mtg-305.1',
    number: '305.1',
    title: 'Land',
    text: 'A land is a permanent. A land card can be played only as the main action during the player\'s main phase when the stack is empty. Playing a land doesn\'t use the stack.',
    keywords: ['land', 'permanent', 'play land', 'main phase', 'once per turn', 'land drop'],
    category: 'card-types'
  },
  {
    id: 'mtg-305.2',
    number: '305.2',
    title: 'Land Per Turn',
    text: 'A player may play one land per turn during their main phase. Playing a land is a special action that doesn\'t use the stack.',
    keywords: ['land', 'one per turn', 'land drop', 'special action', 'main phase'],
    category: 'card-types'
  },
  {
    id: 'mtg-306.1',
    number: '306.1',
    title: 'Planeswalker',
    text: 'A planeswalker is a permanent. Planeswalkers enter the battlefield with loyalty counters and can activate loyalty abilities. Damage dealt to a planeswalker removes that many loyalty counters.',
    keywords: ['planeswalker', 'loyalty', 'loyalty counter', 'loyalty ability', 'permanent', 'damage'],
    category: 'card-types'
  },
  {
    id: 'mtg-307.1',
    number: '307.1',
    title: 'Sorcery',
    text: 'A sorcery is a spell. A sorcery can be cast only during the main phase when the stack is empty. A sorcery is not a permanent and goes to the graveyard after resolving.',
    keywords: ['sorcery', 'spell', 'main phase', 'not permanent', 'graveyard', 'resolve'],
    category: 'card-types'
  },
  {
    id: 'mtg-308.1',
    number: '308.1',
    title: 'Artifact',
    text: 'An artifact is a permanent. An artifact card can be cast only during the main phase when the stack is empty. Many artifacts have activated abilities.',
    keywords: ['artifact', 'permanent', 'main phase', 'colorless', 'equipment'],
    category: 'card-types'
  },

  // 4. Zones
  {
    id: 'mtg-400.1',
    number: '400.1',
    title: 'Game Zones',
    text: 'A zone is a place where objects can be during a game. The zones are: library, hand, battlefield, graveyard, stack, exile, and command.',
    keywords: ['zone', 'library', 'hand', 'battlefield', 'graveyard', 'stack', 'exile', 'command zone'],
    category: 'zones'
  },
  {
    id: 'mtg-401.1',
    number: '401.1',
    title: 'Library',
    text: 'The library is where a player\'s deck is kept during the game. Players draw cards from the top of their library. The order of cards in a library cannot be changed except by effects.',
    keywords: ['library', 'deck', 'draw', 'top of library', 'shuffle'],
    category: 'zones'
  },
  {
    id: 'mtg-402.1',
    number: '402.1',
    title: 'Hand',
    text: 'The hand is where a player holds cards they have drawn but not yet played. Each player has their own hand. There is no maximum hand size during a player\'s turn, but at end of turn, a player must discard down to 7.',
    keywords: ['hand', 'hand size', 'maximum hand size', 'discard', 'seven cards', '7 cards'],
    category: 'zones'
  },
  {
    id: 'mtg-403.1',
    number: '403.1',
    title: 'Battlefield',
    text: 'The battlefield is the zone where permanents exist. It is shared by all players. Creatures, artifacts, enchantments, lands, and planeswalkers are permanents.',
    keywords: ['battlefield', 'in play', 'permanent', 'shared zone', 'enters the battlefield', 'ETB'],
    category: 'zones'
  },
  {
    id: 'mtg-404.1',
    number: '404.1',
    title: 'Graveyard',
    text: 'The graveyard is a player\'s discard pile. Each player has their own graveyard. Cards that are discarded, destroyed, sacrificed, or have resolved go to the graveyard.',
    keywords: ['graveyard', 'discard', 'destroyed', 'sacrifice', 'dies', 'discard pile'],
    category: 'zones'
  },
  {
    id: 'mtg-405.1',
    number: '405.1',
    title: 'Stack',
    text: 'The stack is where spells and abilities wait to resolve. Spells and abilities resolve in last-in, first-out order. Players can respond to spells and abilities on the stack.',
    keywords: ['stack', 'resolve', 'response', 'priority', 'LIFO', 'last in first out'],
    category: 'zones'
  },
  {
    id: 'mtg-406.1',
    number: '406.1',
    title: 'Exile',
    text: 'The exile zone is where cards are put when effects exile them. Cards in exile are normally removed from the game, though some effects can interact with exiled cards.',
    keywords: ['exile', 'exiled', 'removed from game', 'exile zone'],
    category: 'zones'
  },

  // 5. Turn Structure
  {
    id: 'mtg-500.1',
    number: '500.1',
    title: 'Turn Structure',
    text: 'A turn consists of five phases: beginning phase, first main phase, combat phase, second main phase, and ending phase.',
    keywords: ['turn', 'phase', 'beginning', 'main phase', 'combat', 'ending', 'turn structure'],
    category: 'turn-structure'
  },
  {
    id: 'mtg-501.1',
    number: '501.1',
    title: 'Beginning Phase',
    text: 'The beginning phase has three steps: untap, upkeep, and draw. During untap, the active player untaps all their permanents. During upkeep, triggers happen. During draw, the active player draws a card.',
    keywords: ['beginning phase', 'untap', 'upkeep', 'draw step', 'untap step'],
    category: 'turn-structure'
  },
  {
    id: 'mtg-502.1',
    number: '502.1',
    title: 'Untap Step',
    text: 'During the untap step, the active player untaps all their permanents. No player receives priority during the untap step, so no spells can be cast and no abilities can be activated.',
    keywords: ['untap', 'untap step', 'no priority', 'permanents untap'],
    category: 'turn-structure'
  },
  {
    id: 'mtg-504.1',
    number: '504.1',
    title: 'Draw Step',
    text: 'The active player draws a card. This happens before players receive priority. On the first turn of the game, the player who goes first skips their draw step.',
    keywords: ['draw', 'draw step', 'first turn', 'skip draw', 'draw a card'],
    category: 'turn-structure'
  },
  {
    id: 'mtg-505.1',
    number: '505.1',
    title: 'Main Phase',
    text: 'During the main phase, the active player may cast spells and play lands. Sorceries and creatures can only be cast during the main phase when the stack is empty.',
    keywords: ['main phase', 'cast', 'play land', 'sorcery', 'creature', 'stack empty'],
    category: 'turn-structure'
  },
  {
    id: 'mtg-506.1',
    number: '506.1',
    title: 'Combat Phase',
    text: 'The combat phase has five steps: beginning of combat, declare attackers, declare blockers, combat damage, and end of combat.',
    keywords: ['combat', 'combat phase', 'attack', 'block', 'combat damage', 'declare attackers', 'declare blockers'],
    category: 'turn-structure'
  },
  {
    id: 'mtg-512.1',
    number: '512.1',
    title: 'End Step',
    text: 'During the end step, abilities that trigger "at the beginning of the end step" or "at end of turn" trigger. After that, players receive priority.',
    keywords: ['end step', 'end of turn', 'end phase', 'trigger'],
    category: 'turn-structure'
  },
  {
    id: 'mtg-514.1',
    number: '514.1',
    title: 'Cleanup Step',
    text: 'During cleanup, the active player discards down to their maximum hand size (usually 7). Then, damage is removed from permanents and "until end of turn" effects end.',
    keywords: ['cleanup', 'discard', 'hand size', 'damage removed', 'until end of turn'],
    category: 'turn-structure'
  },

  // 6. Spells, Abilities, and Effects
  {
    id: 'mtg-601.1',
    number: '601.1',
    title: 'Casting Spells',
    text: 'A player casts a spell by announcing it, putting it on the stack, choosing modes and targets, determining costs, and paying costs. Then other players may respond.',
    keywords: ['cast', 'casting', 'spell', 'stack', 'target', 'pay cost', 'announce'],
    category: 'spells-abilities'
  },
  {
    id: 'mtg-601.2',
    number: '601.2',
    title: 'Casting Steps',
    text: 'To cast a spell: 1) Announce the spell, 2) Choose modes, 3) Choose targets, 4) Divide effects, 5) Determine total cost, 6) Activate mana abilities, 7) Pay costs.',
    keywords: ['cast', 'steps', 'modes', 'targets', 'cost', 'mana abilities', 'pay'],
    category: 'spells-abilities'
  },
  {
    id: 'mtg-602.1',
    number: '602.1',
    title: 'Activated Abilities',
    text: 'An activated ability has a cost and effect, separated by a colon. The player pays the cost to put the ability on the stack. Format: "[Cost]: [Effect]"',
    keywords: ['activated ability', 'cost', 'colon', 'tap', 'pay', 'activate'],
    category: 'spells-abilities'
  },
  {
    id: 'mtg-603.1',
    number: '603.1',
    title: 'Triggered Abilities',
    text: 'Triggered abilities begin with "when," "whenever," or "at." They trigger automatically when their condition is met and go on the stack.',
    keywords: ['triggered ability', 'trigger', 'when', 'whenever', 'at', 'automatic', 'stack'],
    category: 'spells-abilities'
  },
  {
    id: 'mtg-605.1',
    number: '605.1',
    title: 'Mana Abilities',
    text: 'A mana ability is an ability that produces mana and doesn\'t target. Mana abilities don\'t use the stack and resolve immediately.',
    keywords: ['mana ability', 'produce mana', 'tap for mana', 'no stack', 'immediate'],
    category: 'spells-abilities'
  },
  {
    id: 'mtg-608.1',
    number: '608.1',
    title: 'Resolving Spells',
    text: 'When a spell resolves, its instructions are followed in order. If the spell is a permanent, it enters the battlefield. If it\'s an instant or sorcery, it goes to the graveyard.',
    keywords: ['resolve', 'resolving', 'spell', 'permanent', 'battlefield', 'graveyard'],
    category: 'spells-abilities'
  },
  {
    id: 'mtg-608.2b',
    number: '608.2b',
    title: 'Illegal Targets',
    text: 'If all of a spell\'s targets become illegal before it resolves, the spell is countered by game rules. If some targets are legal, the spell resolves but has no effect on illegal targets.',
    keywords: ['target', 'illegal target', 'counter', 'fizzle', 'resolve'],
    category: 'spells-abilities'
  },

  // 7. Combat
  {
    id: 'mtg-508.1',
    number: '508.1',
    title: 'Declaring Attackers',
    text: 'The active player declares which creatures are attacking and what they\'re attacking. Tapped creatures and creatures with summoning sickness cannot attack.',
    keywords: ['attack', 'declare attackers', 'attacking', 'tapped', 'summoning sickness'],
    category: 'combat'
  },
  {
    id: 'mtg-509.1',
    number: '509.1',
    title: 'Declaring Blockers',
    text: 'The defending player declares which creatures are blocking and what they\'re blocking. A creature can only block if it\'s untapped. Multiple creatures can block a single attacker.',
    keywords: ['block', 'declare blockers', 'blocking', 'untapped', 'multiple blockers'],
    category: 'combat'
  },
  {
    id: 'mtg-510.1',
    number: '510.1',
    title: 'Combat Damage',
    text: 'Each creature assigns combat damage equal to its power. Creatures deal damage simultaneously. If a creature is blocked by multiple creatures, the attacker chooses damage assignment order.',
    keywords: ['combat damage', 'power', 'damage', 'assignment order', 'blocked'],
    category: 'combat'
  },
  {
    id: 'mtg-510.2',
    number: '510.2',
    title: 'First Strike Damage',
    text: 'If any attacking or blocking creature has first strike or double strike, there is an additional combat damage step. First strike damage happens before regular combat damage.',
    keywords: ['first strike', 'double strike', 'combat damage', 'before regular'],
    category: 'combat'
  },
  {
    id: 'mtg-702.19',
    number: '702.19',
    title: 'Trample',
    text: 'Trample allows a creature to deal excess combat damage to the player or planeswalker it\'s attacking. After assigning lethal damage to blockers, remaining damage goes through.',
    keywords: ['trample', 'excess damage', 'lethal damage', 'blocked creature', 'damage through'],
    category: 'combat'
  },

  // 8. Keywords
  {
    id: 'mtg-702.2',
    number: '702.2',
    title: 'Deathtouch',
    text: 'Any amount of damage dealt to a creature by a source with deathtouch is considered lethal damage. One damage from deathtouch is enough to destroy any creature.',
    keywords: ['deathtouch', 'lethal damage', 'destroy', 'one damage'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.3',
    number: '702.3',
    title: 'Defender',
    text: 'A creature with defender cannot attack. It can still block.',
    keywords: ['defender', 'cannot attack', 'block only', 'wall'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.7',
    number: '702.7',
    title: 'First Strike',
    text: 'A creature with first strike deals combat damage before creatures without first strike. If a creature is destroyed by first strike damage, it won\'t deal combat damage.',
    keywords: ['first strike', 'combat damage', 'before', 'destroyed first'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.4',
    number: '702.4',
    title: 'Double Strike',
    text: 'A creature with double strike deals combat damage twice: once during the first strike combat damage step and once during the regular combat damage step.',
    keywords: ['double strike', 'combat damage', 'twice', 'first strike', 'regular damage'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.9',
    number: '702.9',
    title: 'Flying',
    text: 'A creature with flying can only be blocked by creatures with flying or reach. Flying creatures can block both flying and non-flying creatures.',
    keywords: ['flying', 'block', 'reach', 'evasion', 'cannot block'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.10',
    number: '702.10',
    title: 'Haste',
    text: 'A creature with haste can attack and use tap abilities the turn it comes under your control. It ignores "summoning sickness."',
    keywords: ['haste', 'attack', 'tap', 'summoning sickness', 'same turn'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.11',
    number: '702.11',
    title: 'Hexproof',
    text: 'A permanent with hexproof cannot be the target of spells or abilities your opponents control. You can still target your own hexproof permanents.',
    keywords: ['hexproof', 'cannot target', 'opponents', 'protection', 'untargetable'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.12',
    number: '702.12',
    title: 'Indestructible',
    text: 'A permanent with indestructible cannot be destroyed. It doesn\'t die from lethal damage and effects that say "destroy" don\'t work on it. It can still be exiled, sacrificed, or have its toughness reduced to 0.',
    keywords: ['indestructible', 'cannot be destroyed', 'lethal damage', 'exile', 'sacrifice', '0 toughness'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.15',
    number: '702.15',
    title: 'Lifelink',
    text: 'Damage dealt by a creature with lifelink also causes its controller to gain that much life. This happens simultaneously with the damage.',
    keywords: ['lifelink', 'gain life', 'damage', 'life gain', 'simultaneously'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.16',
    number: '702.16',
    title: 'Menace',
    text: 'A creature with menace cannot be blocked except by two or more creatures. A single creature cannot block a creature with menace.',
    keywords: ['menace', 'block', 'two creatures', 'multiple blockers', 'evasion'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.17',
    number: '702.17',
    title: 'Reach',
    text: 'A creature with reach can block creatures with flying. Reach does not grant flying.',
    keywords: ['reach', 'block', 'flying', 'can block flyers'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.21',
    number: '702.21',
    title: 'Vigilance',
    text: 'A creature with vigilance does not tap when it attacks. It can attack and still be available to block.',
    keywords: ['vigilance', 'attack', 'tap', 'does not tap', 'block'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.8',
    number: '702.8',
    title: 'Flash',
    text: 'A spell with flash can be cast at any time you could cast an instant. This includes during other players\' turns and in response to spells and abilities.',
    keywords: ['flash', 'instant speed', 'any time', 'response', 'opponent\'s turn'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.21a',
    number: '702.21a',
    title: 'Ward',
    text: 'Ward is a triggered ability that counters spells or abilities targeting the permanent unless the opponent pays a cost. Ward protects from targeted effects.',
    keywords: ['ward', 'counter', 'target', 'pay cost', 'protection', 'trigger'],
    category: 'keywords'
  },
  {
    id: 'mtg-702.89',
    number: '702.89',
    title: 'Prowess',
    text: 'Prowess triggers whenever you cast a noncreature spell. The creature gets +1/+1 until end of turn for each trigger.',
    keywords: ['prowess', 'noncreature spell', '+1/+1', 'trigger', 'cast'],
    category: 'keywords'
  },

  // 9. Common Questions
  {
    id: 'mtg-faq-priority',
    number: 'FAQ.1',
    title: 'Priority',
    text: 'Priority determines when a player can take actions. The active player gets priority first. After a spell is cast or ability activated, priority passes. When all players pass priority in succession, the top spell/ability on the stack resolves.',
    keywords: ['priority', 'pass', 'respond', 'stack', 'resolve', 'action'],
    category: 'spells-abilities'
  },
  {
    id: 'mtg-faq-dies',
    number: 'FAQ.2',
    title: 'Dies',
    text: '"Dies" means a creature is put into a graveyard from the battlefield. A creature that is exiled or returned to hand does not "die." Tokens that die go to the graveyard briefly then cease to exist.',
    keywords: ['dies', 'graveyard', 'battlefield', 'death trigger', 'token', 'exile'],
    category: 'zones'
  },
  {
    id: 'mtg-faq-sacrifice',
    number: 'FAQ.3',
    title: 'Sacrifice',
    text: 'To sacrifice a permanent, you move it from the battlefield to its owner\'s graveyard. Only the controller of a permanent can sacrifice it. Sacrifice cannot be prevented or regenerated.',
    keywords: ['sacrifice', 'graveyard', 'controller', 'cannot prevent', 'cost'],
    category: 'spells-abilities'
  },
  {
    id: 'mtg-faq-state-based',
    number: 'FAQ.4',
    title: 'State-Based Actions',
    text: 'State-based actions are game rules that are checked whenever a player would receive priority. They include: creatures with 0 toughness die, players with 0 life lose, and legendary duplicates are sacrificed.',
    keywords: ['state-based action', 'SBA', 'toughness', 'life', 'legendary rule', 'check'],
    category: 'game-concepts'
  },
  {
    id: 'mtg-faq-legendary',
    number: 'FAQ.5',
    title: 'Legendary Rule',
    text: 'If a player controls two or more legendary permanents with the same name, they must choose one and put the rest into their owner\'s graveyard. This is a state-based action.',
    keywords: ['legendary', 'legendary rule', 'same name', 'sacrifice', 'state-based action'],
    category: 'game-concepts'
  },
  {
    id: 'mtg-faq-commander',
    number: 'FAQ.6',
    title: 'Commander Format',
    text: 'Commander is a 100-card singleton format. Each deck has a legendary creature as its commander in the command zone. You may only include cards within your commander\'s color identity. Commander damage of 21 from a single commander causes a player to lose.',
    keywords: ['commander', 'edh', 'singleton', '100 cards', 'color identity', 'command zone', '21 damage'],
    category: 'multiplayer'
  },
];

export function searchMTGRules(query: string): Rule[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  // Score each rule based on relevance
  const scored = MTG_RULES.map(rule => {
    let score = 0;
    
    // Check title match
    if (rule.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Check keyword matches
    for (const keyword of rule.keywords) {
      if (queryLower.includes(keyword)) {
        score += 5;
      }
      for (const word of queryWords) {
        if (keyword.includes(word)) {
          score += 2;
        }
      }
    }
    
    // Check text matches
    const textLower = rule.text.toLowerCase();
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        score += 1;
      }
    }
    
    // Exact phrase match in text
    if (textLower.includes(queryLower)) {
      score += 8;
    }
    
    return { rule, score };
  });
  
  // Return rules sorted by score, filtering out zero scores
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.rule);
}
