import { searchMTGRules, MTG_RULES, MTG_RULE_CATEGORIES, type Rule } from './mtgRules';

export type GameSystem = 'mtg' | 'warhammer' | 'general';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rules?: Rule[];
  timestamp: Date;
}

// Pre-written explanations for common topics - these provide actual answers, not just rule citations
const TOPIC_EXPLANATIONS: { [key: string]: string } = {
  // Keywords
  'trample': `**Trample** lets your creature deal excess combat damage to the defending player or planeswalker.\n\nHere's how it works: When your trampling creature is blocked, you first assign lethal damage to each blocker (at least equal to their toughness). Any leftover damage "tramples over" to the original target.\n\n**Example:** Your 7/7 with trample is blocked by a 2/2. You assign 2 damage to kill the blocker, and the remaining 5 damage hits your opponent.`,
  
  'flying': `**Flying** is an evasion ability that makes a creature harder to block.\n\nCreatures with flying can only be blocked by other creatures with flying OR creatures with reach. However, a flying creature can block both flying and non-flying attackers.\n\n**Tip:** Flying is one of the strongest combat keywords because it often lets your creatures attack uncontested.`,
  
  'deathtouch': `**Deathtouch** means any amount of damage this creature deals to another creature is lethal.\n\nEven 1 damage from a deathtouch creature will destroy any creature, regardless of toughness. This makes deathtouch creatures excellent blockers - opponents often won't want to trade their big creature for your small deathtouch creature.\n\n**Pro tip:** Deathtouch + trample is a powerful combo. You only need to assign 1 damage to each blocker (since it's lethal), and the rest tramples through!`,
  
  'first strike': `**First Strike** lets a creature deal its combat damage before creatures without first strike.\n\nIn combat, first strike creatures deal damage in an earlier damage step. If a first striker kills its opponent before regular damage, that creature won't deal damage back.\n\n**Example:** Your 2/2 first strike blocks their 3/2. Your creature deals 2 damage first, killing their creature. Their creature never gets to hit back!`,
  
  'double strike': `**Double Strike** means a creature deals combat damage twice - once during first strike and once during regular combat damage.\n\nThis effectively doubles the creature's damage output in combat. A 3/3 with double strike deals 6 total combat damage!\n\n**Note:** Double strike includes first strike, so your creature will kill normal creatures before they can hit back, AND deal damage again in the regular step.`,
  
  'hexproof': `**Hexproof** protects a permanent from your opponents' targeted spells and abilities.\n\nYour opponents cannot target a hexproof creature with removal like "destroy target creature" or effects like "exile target permanent." However, YOU can still target your own hexproof creatures with beneficial effects.\n\n**Important:** Hexproof doesn't protect against non-targeted effects like "destroy all creatures" or "each player sacrifices a creature."`,
  
  'indestructible': `**Indestructible** means a permanent cannot be destroyed by damage or "destroy" effects.\n\nIndestructible creatures survive lethal damage and effects that say "destroy." However, they CAN still be:\n• Exiled\n• Sacrificed\n• Returned to hand/library\n• Given -X/-X until toughness reaches 0\n\n**Remember:** Indestructible prevents destruction, not removal in general.`,
  
  'lifelink': `**Lifelink** causes you to gain life equal to the damage dealt by that creature.\n\nWhenever a creature with lifelink deals damage (combat or otherwise), you gain that much life. This happens simultaneously with the damage.\n\n**Example:** Your 4/4 lifelink attacks and isn't blocked. You deal 4 damage AND gain 4 life. If it had been blocked by a 2/2, you'd still gain 4 life (the damage it dealt).`,
  
  'vigilance': `**Vigilance** means a creature doesn't tap when it attacks.\n\nNormally, attacking creatures tap, leaving them unable to block on your opponent's turn. Vigilance lets you attack AND keep the creature untapped to block, activate tap abilities, or just look threatening.\n\n**This is great for:** Defensive creatures, creatures with tap abilities, and maintaining board presence.`,
  
  'haste': `**Haste** lets a creature attack and use tap abilities immediately, ignoring summoning sickness.\n\nNormally, creatures can't attack or tap the turn they enter the battlefield. Haste bypasses this restriction, letting you be aggressive right away.\n\n**Common on:** Red creatures, which emphasize speed and aggression.`,
  
  'flash': `**Flash** lets you cast a spell any time you could cast an instant.\n\nThis means you can cast creatures, enchantments, or artifacts during your opponent's turn or in response to spells. Flash creates surprise blockers, lets you hold up mana for responses, and keeps opponents guessing.\n\n**Pro tip:** Hold flash creatures until the last moment - either as surprise blockers or cast at end of opponent's turn to dodge sorcery-speed removal.`,
  
  'menace': `**Menace** requires at least two creatures to block this attacker.\n\nA single creature cannot block a creature with menace, no matter how big it is. This makes menace great for getting damage through when opponents have limited blockers.\n\n**Note:** The blockers don't need to be able to kill it - just having two creatures satisfies the requirement.`,
  
  'reach': `**Reach** lets a creature block creatures with flying.\n\nNormally, only flying creatures can block flyers. Reach gives ground-based creatures the ability to swat down aerial threats. Reach does NOT give flying - a creature with reach still can't fly over blockers.\n\n**Thematically:** Usually on archers, spiders, and tall creatures.`,
  
  'ward': `**Ward** is a triggered ability that counters spells/abilities targeting the permanent unless the opponent pays a cost.\n\nWhen an opponent targets your creature with ward, they must pay the ward cost (often mana or life) or the spell/ability is countered. This protects against targeted removal while still being beatable.\n\n**Note:** Ward triggers each time the permanent is targeted, even multiple times per turn.`,
  
  'prowess': `**Prowess** triggers whenever you cast a noncreature spell, giving the creature +1/+1 until end of turn.\n\nEach noncreature spell you cast triggers prowess separately. Cast 3 instants? That's +3/+3! This rewards spell-heavy decks and makes combat math tricky for opponents.\n\n**Best with:** Cheap cantrips, instants, and sorceries that let you chain multiple spells.`,
  
  // Game concepts
  'summoning sickness': `**Summoning Sickness** prevents creatures from attacking or using tap abilities the turn they enter the battlefield.\n\nA creature has summoning sickness until it has been continuously under your control since the start of your most recent turn. This means:\n• Can't attack\n• Can't use abilities with the tap symbol\n• CAN still block\n• CAN use abilities without the tap symbol\n\n**Haste** bypasses summoning sickness entirely.`,
  
  'stack': `**The Stack** is where spells and abilities wait to resolve. It works on a "last in, first out" basis.\n\nWhen you cast a spell, it goes on the stack. Before it resolves, opponents can respond with their own spells/abilities, which go on TOP of the stack. The top item always resolves first.\n\n**Example:**\n1. You cast Lightning Bolt targeting a creature\n2. Opponent casts Giant Growth on that creature (goes on top)\n3. Giant Growth resolves first (+3/+3)\n4. Then Lightning Bolt resolves (3 damage to now-bigger creature)\n\nThis is why "in response" is so important in Magic!`,
  
  'priority': `**Priority** determines when players can take actions.\n\nThe active player (whose turn it is) gets priority first. After casting a spell or activating an ability, priority passes around the table. When all players pass priority in succession without doing anything, the top item on the stack resolves.\n\n**Key points:**\n• You can't cast spells without priority\n• Passing priority doesn't skip your turn\n• Both players must pass for anything to resolve`,
  
  'state-based actions': `**State-Based Actions** are game rules that are automatically checked and applied whenever a player would receive priority.\n\nCommon state-based actions:\n• Creature with 0 or less toughness dies\n• Player with 0 or less life loses\n• Player with 10+ poison counters loses\n• Legendary rule (choose one if you control two with same name)\n• Aura not attached to legal permanent goes to graveyard\n\n**Important:** These happen automatically - no one "does" them, they just happen.`,
  
  'legendary rule': `**The Legendary Rule** prevents you from controlling multiple legendary permanents with the same name.\n\nIf you control two or more legendary permanents with the same name, you must immediately choose one to keep and put the rest into their owners' graveyards. This is a state-based action.\n\n**Note:** This only affects YOUR permanents. Your opponent can have their own copy of the same legendary.`,
  
  // Zones
  'graveyard': `**The Graveyard** is your discard pile where cards go when destroyed, discarded, or after spells resolve.\n\nCards in the graveyard are public information - anyone can look through it. Many cards interact with the graveyard:\n• Reanimation effects bring creatures back\n• Flashback lets you cast spells from the graveyard\n• Some cards get stronger based on graveyard size\n\n**"Dies"** specifically means going from battlefield to graveyard (not exile or other zones).`,
  
  'exile': `**Exile** is a zone where cards are removed from the normal game.\n\nExiled cards are generally gone for good - most effects can't bring them back. However, some cards exile things temporarily with a return condition.\n\n**Key difference from graveyard:** Exile dodges graveyard recursion, so it's a more permanent answer to threats.`,
  
  'battlefield': `**The Battlefield** is the shared zone where permanents exist during the game.\n\nCreatures, lands, artifacts, enchantments, and planeswalkers are all permanents that stay on the battlefield. Instants and sorceries never enter the battlefield - they resolve and go to the graveyard.\n\n**"Enters the battlefield" (ETB)** effects trigger when a permanent moves to this zone.`,
  
  // Turn structure
  'phases': `**Turn Structure** - Each turn has these phases in order:\n\n**1. Beginning Phase**\n   • Untap (untap your stuff, no spells allowed)\n   • Upkeep (triggers happen)\n   • Draw (draw a card)\n\n**2. First Main Phase** - Play lands, cast spells\n\n**3. Combat Phase** - Attack!\n\n**4. Second Main Phase** - Play lands, cast more spells\n\n**5. Ending Phase**\n   • End step (triggers)\n   • Cleanup (discard to 7, damage wears off)`,
  
  'combat': `**Combat** happens during the combat phase and has five steps:\n\n**1. Beginning of Combat** - Last chance to tap attackers\n\n**2. Declare Attackers** - Choose which creatures attack and what they're attacking\n\n**3. Declare Blockers** - Defending player assigns blockers\n\n**4. Combat Damage** - Creatures deal damage equal to their power\n\n**5. End of Combat** - Combat ends, creatures are still "attacking/blocking" until step ends\n\n**Remember:** Attacking taps the creature (unless it has vigilance).`,
  
  // Card types
  'instant': `**Instants** are spells you can cast at almost any time - during your turn, your opponent's turn, or in response to other spells.\n\nThis flexibility is their main advantage. Hold up mana to represent a possible instant, then cast it when most impactful (or cast something else if they don't give you a good target).\n\n**Common instant effects:** Removal, counterspells, combat tricks, card draw`,
  
  'sorcery': `**Sorceries** are spells that can only be cast during your main phase when the stack is empty.\n\nThis "sorcery speed" restriction means opponents can respond but you can't cast them reactively. In exchange, sorceries often have stronger effects than similarly-costed instants.\n\n**Examples:** Board wipes, big card draw, tutors`,
  
  'planeswalker': `**Planeswalkers** are powerful permanents that act like allies fighting alongside you.\n\nKey rules:\n• Enter with loyalty counters (the number in bottom right)\n• Can activate ONE loyalty ability per turn (on your turn, sorcery speed)\n• +X abilities add loyalty, -X abilities cost loyalty\n• Opponents can attack planeswalkers instead of you\n• Damage to planeswalkers removes that many loyalty counters\n• 0 loyalty = planeswalker dies`,
  
  // Common questions  
  'land per turn': `You can normally play **one land per turn**, during either of your main phases.\n\nPlaying a land is a special action that doesn't use the stack and can't be responded to. Some cards let you play additional lands.\n\n**Remember:** Playing a land is different from casting a spell - land plays don't trigger prowess and can't be countered.`,
  
  'win the game': `**Ways to Win:**\n\n• **Reduce opponent to 0 life** - Most common\n• **Opponent draws from empty library** - "Mill" or "decking"\n• **Opponent has 10+ poison counters** - Infect strategy\n• **Card says "you win"** - Alternative win conditions\n• **Commander damage** - 21 combat damage from a single commander\n\n**You also win if all opponents have lost!**`,
  
  'commander': `**Commander (EDH)** is a popular multiplayer format:\n\n• **100-card singleton deck** (only 1 copy of each card, except basic lands)\n• **Legendary creature as commander** (starts in command zone)\n• **Color identity** - Only cards matching commander's colors allowed\n• **40 starting life**\n• **Commander damage** - 21 combat damage from one commander = loss\n• **Command zone tax** - Costs 2 more each time cast from command zone`,
};

// Keyword interaction explanations - when multiple keywords appear together
const KEYWORD_INTERACTIONS: { [key: string]: string } = {
  // Deathtouch interactions
  'deathtouch+indestructible': `**Deathtouch vs Indestructible**\n\nWhen a creature with deathtouch deals damage to an indestructible creature:\n\n• The deathtouch damage is considered **lethal** (it would destroy a normal creature)\n• BUT indestructible **prevents destruction** from any source\n• The indestructible creature **survives**\n\n**Result:** The indestructible creature takes the damage but doesn't die. Deathtouch says "this damage is lethal," but indestructible says "I can't be destroyed by damage."\n\n**Ways to beat indestructible:**\n• Exile effects\n• -X/-X effects (reducing toughness to 0)\n• Sacrifice effects\n• "Destroy" doesn't work, but these do!`,

  'deathtouch+trample': `**Deathtouch + Trample Combo**\n\nThis is a powerful combination! Here's why:\n\n• Trample requires you to assign **lethal damage** to blockers before trampling over\n• Deathtouch makes **any amount of damage lethal** (even 1)\n• So you only need to assign **1 damage per blocker**!\n\n**Example:** Your 7/7 with deathtouch and trample is blocked by three 5/5 creatures.\n• Assign 1 damage to each blocker (3 total) - all three die to deathtouch\n• The remaining 4 damage tramples through to your opponent!`,

  'deathtouch+first strike': `**Deathtouch + First Strike**\n\nThis combination makes an excellent blocker:\n\n• First strike deals damage **before** regular combat damage\n• Deathtouch makes that damage **lethal**\n• The opposing creature **dies before it can hit back**\n\n**Example:** Your 1/1 with deathtouch and first strike blocks a 10/10.\n• Your creature deals 1 damage first (lethal due to deathtouch)\n• The 10/10 dies before dealing its damage\n• Your 1/1 survives!\n\nThis is why Glissa, the Traitor and similar cards are so good.`,

  'first strike+double strike': `**First Strike vs Double Strike**\n\n• **First strike** deals damage in an early combat damage step\n• **Double strike** deals damage in BOTH the first strike step AND the regular step\n\nDouble strike is strictly better - it includes first strike AND deals damage twice.\n\n**Example:** A 3/3 double strike vs a 4/4 first strike:\n• First strike step: Both deal damage (3 to the 4/4, 4 to the 3/3)\n• The 3/3 survives (1 damage), the 4/4 survives (3 damage)\n• Regular step: Only the double striker deals again (+3 damage to 4/4)\n• The 4/4 dies (6 total damage), double striker wins!`,

  'hexproof+indestructible': `**Hexproof + Indestructible**\n\nA creature with both is very hard to remove:\n\n• **Hexproof** - Can't be targeted by opponent's spells/abilities\n• **Indestructible** - Can't be destroyed by damage or "destroy" effects\n\n**What still works:**\n• Board wipes that don't say "destroy" (exile all, -X/-X to all)\n• Sacrifice effects ("each player sacrifices a creature")\n• Effects that don't target ("exile all creatures")\n• Reducing toughness to 0 with -X/-X\n\n**What doesn't work:**\n• Targeted removal\n• Damage-based removal\n• "Destroy target/all" effects`,

  'lifelink+deathtouch': `**Lifelink + Deathtouch**\n\nBoth abilities work independently:\n\n• **Deathtouch** - Any damage to creatures is lethal\n• **Lifelink** - You gain life equal to damage dealt\n\nThis makes a great defensive creature:\n• Blocks and kills any attacker (deathtouch)\n• Gains you life in the process (lifelink)\n\n**Combat example:** Your 2/2 lifelink deathtouch blocks a 6/6.\n• You deal 2 damage (lethal to the 6/6)\n• You gain 2 life\n• Their 6/6 dies, your creature takes 6 and dies too\n\nBut you traded up AND gained life!`,

  'trample+indestructible': `**Trample vs Indestructible Blocker**\n\nWhen a trampling creature is blocked by an indestructible creature:\n\n• You must still assign **lethal damage** to the blocker\n• For a normal creature, lethal = its toughness\n• Indestructible doesn't change how much is "lethal"\n\n**Example:** Your 7/7 trample attacks, blocked by a 3/3 indestructible.\n• You assign 3 damage to the blocker (lethal amount)\n• 4 damage tramples through to opponent\n• The 3/3 survives (indestructible) but took the damage\n\nIndestructible doesn't absorb extra damage - trample still works!`,

  'flying+reach': `**Flying vs Reach**\n\n• **Flying** - Can only be blocked by flying or reach creatures\n• **Reach** - Can block creatures with flying\n\n**Key points:**\n• Reach does NOT give flying\n• A creature with reach can't fly over blockers\n• Flying creatures CAN block non-flying creatures\n• Reach is purely a "can block flyers" ability\n\n**In combat:** A flying attacker can be blocked by a reach creature. A reach creature attacking can be blocked by anything.`,

  'menace+flying': `**Menace + Flying**\n\nThis combination is hard to block:\n\n• **Flying** - Only flying/reach creatures can block\n• **Menace** - Requires TWO creatures to block\n\nYour opponent needs **two creatures with flying or reach** to block. This often means the creature is unblockable in practice.\n\n**Even better with:** Trample (if they can't block properly, damage tramples), or Deathtouch (kills whatever does block).`,

  'vigilance+lifelink': `**Vigilance + Lifelink**\n\nA great defensive combination:\n\n• **Vigilance** - Doesn't tap when attacking\n• **Lifelink** - Gains life when dealing damage\n\n**Benefits:**\n• Attack to gain life AND stay untapped to block\n• Threaten both offense and defense every turn\n• Gain life on both your attack and their attack (if you block)\n\nThis is why cards like Baneslayer Angel are so strong - constant life gain while maintaining a defensive presence.`,

  'protection+indestructible': `**Protection vs Indestructible**\n\nThese are different abilities:\n\n**Protection from [X]** prevents:\n• **D**amage from X sources\n• **E**nchanting/Equipping by X\n• **B**locking by X creatures\n• **T**argeting by X spells/abilities\n\n**Indestructible** only prevents:\n• Destruction from damage\n• Destruction from "destroy" effects\n\n**Key difference:** Protection prevents the damage entirely. Indestructible takes the damage but survives. Protection also prevents targeting; indestructible doesn't.`,

  'wither+deathtouch': `**Wither + Deathtouch** (or Infect + Deathtouch)\n\nWither/Infect deal damage as -1/-1 counters to creatures:\n\n• Deathtouch makes ANY damage lethal\n• So 1 -1/-1 counter kills the creature\n• The creature still gets the counter (if it somehow survives)\n\n**With Infect:** This is especially brutal because infect also deals poison counters to players. A 1/1 infect deathtouch is a real threat.`,

  'shroud+hexproof': `**Shroud vs Hexproof**\n\n• **Shroud** - Can't be targeted by ANY spells or abilities (even yours!)\n• **Hexproof** - Can't be targeted by OPPONENTS' spells or abilities\n\nHexproof is generally better because you can still:\n• Equip your hexproof creature\n• Enchant it with auras\n• Target it with pump spells\n\nShroud was the older ability; hexproof replaced it for most new cards.`,
};

// All known keywords for detection
const KNOWN_KEYWORDS = [
  'trample', 'flying', 'deathtouch', 'first strike', 'double strike',
  'hexproof', 'indestructible', 'lifelink', 'vigilance', 'haste',
  'flash', 'menace', 'reach', 'ward', 'prowess', 'shroud', 'protection',
  'wither', 'infect', 'defender', 'fear', 'intimidate', 'skulk',
  'shadow', 'horsemanship', 'flanking', 'bushido', 'ninjutsu',
  'unblockable', 'persist', 'undying', 'regenerate', 'phasing',
];

// Detect all keywords mentioned in a query
function detectKeywords(query: string): string[] {
  const queryLower = query.toLowerCase();
  const found: string[] = [];
  
  for (const keyword of KNOWN_KEYWORDS) {
    if (queryLower.includes(keyword)) {
      found.push(keyword);
    }
  }
  
  // Check variations
  const variations: { [key: string]: string } = {
    'first-strike': 'first strike',
    'firststrike': 'first strike',
    'double-strike': 'double strike',
    'doublestrike': 'double strike',
    'death touch': 'deathtouch',
    'death-touch': 'deathtouch',
    'life link': 'lifelink',
    'life-link': 'lifelink',
  };
  
  for (const [variant, keyword] of Object.entries(variations)) {
    if (queryLower.includes(variant) && !found.includes(keyword)) {
      found.push(keyword);
    }
  }
  
  return [...new Set(found)]; // Remove duplicates
}

// Check for known keyword interactions
function findInteractionExplanation(keywords: string[]): string | null {
  if (keywords.length < 2) return null;
  
  // Sort keywords to create consistent keys
  const sortedKeywords = [...keywords].sort();
  
  // Check all combinations
  for (let i = 0; i < sortedKeywords.length; i++) {
    for (let j = i + 1; j < sortedKeywords.length; j++) {
      const key = `${sortedKeywords[i]}+${sortedKeywords[j]}`;
      if (KEYWORD_INTERACTIONS[key]) {
        return KEYWORD_INTERACTIONS[key];
      }
      // Try reverse order too
      const reverseKey = `${sortedKeywords[j]}+${sortedKeywords[i]}`;
      if (KEYWORD_INTERACTIONS[reverseKey]) {
        return KEYWORD_INTERACTIONS[reverseKey];
      }
    }
  }
  
  return null;
}

// Generate combined explanation for multiple topics
function generateCombinedExplanation(keywords: string[]): string | null {
  if (keywords.length === 0) return null;
  
  // If only one keyword, return its explanation
  if (keywords.length === 1 && TOPIC_EXPLANATIONS[keywords[0]]) {
    return TOPIC_EXPLANATIONS[keywords[0]];
  }
  
  // Check for known interactions first
  const interactionExplanation = findInteractionExplanation(keywords);
  if (interactionExplanation) {
    return interactionExplanation;
  }
  
  // If no known interaction, combine individual explanations
  if (keywords.length >= 2) {
    const explanations: string[] = [];
    for (const keyword of keywords) {
      if (TOPIC_EXPLANATIONS[keyword]) {
        explanations.push(TOPIC_EXPLANATIONS[keyword]);
      }
    }
    
    if (explanations.length >= 2) {
      return `I found multiple keywords in your question. Here's how each works:\n\n---\n\n${explanations.join('\n\n---\n\n')}\n\n---\n\n**Interaction:** These abilities generally work independently unless there's a specific rules interaction. Each resolves according to its own rules.`;
    }
  }
  
  // Single keyword with explanation
  if (keywords.length === 1 && TOPIC_EXPLANATIONS[keywords[0]]) {
    return TOPIC_EXPLANATIONS[keywords[0]];
  }
  
  return null;
}

// Generate explanation by finding relevant topic
function findTopicExplanation(query: string): string | null {
  const queryLower = query.toLowerCase();
  
  // First, detect all keywords in the query
  const detectedKeywords = detectKeywords(query);
  
  // If we found multiple keywords, handle as interaction
  if (detectedKeywords.length >= 2) {
    const combinedExplanation = generateCombinedExplanation(detectedKeywords);
    if (combinedExplanation) {
      return combinedExplanation;
    }
  }
  
  // Single keyword or topic match
  if (detectedKeywords.length === 1 && TOPIC_EXPLANATIONS[detectedKeywords[0]]) {
    return TOPIC_EXPLANATIONS[detectedKeywords[0]];
  }
  
  // Check for other topic matches (non-keyword topics)
  const otherTopics = [
    'summoning sickness', 'stack', 'priority', 'state-based actions',
    'legendary rule', 'graveyard', 'exile', 'battlefield', 'phases',
    'combat', 'instant', 'sorcery', 'planeswalker', 'land per turn',
    'win the game', 'commander'
  ];
  
  for (const topic of otherTopics) {
    if (queryLower.includes(topic)) {
      return TOPIC_EXPLANATIONS[topic] || null;
    }
  }
  
  // Keyword variations for non-keyword topics
  const variations: { [key: string]: string } = {
    'state based': 'state-based actions',
    'sba': 'state-based actions',
    'etb': 'battlefield',
    'enters the battlefield': 'battlefield',
    'turn order': 'phases',
    'turn structure': 'phases',
    'phase': 'phases',
    'edh': 'commander',
    'how do i win': 'win the game',
    'how to win': 'win the game',
    'winning': 'win the game',
    'how many land': 'land per turn',
    'lands per turn': 'land per turn',
    'play land': 'land per turn',
  };
  
  for (const [variant, topic] of Object.entries(variations)) {
    if (queryLower.includes(variant) && TOPIC_EXPLANATIONS[topic]) {
      return TOPIC_EXPLANATIONS[topic];
    }
  }
  
  return null;
}

// Keyword synonyms for better matching
const KEYWORD_SYNONYMS: { [key: string]: string[] } = {
  'mana': ['mana', 'mana cost', 'cmc', 'mana value', 'casting cost'],
  'creature': ['creature', 'creatures', 'monster', 'minion'],
  'spell': ['spell', 'spells', 'cast', 'casting'],
  'attack': ['attack', 'attacking', 'combat', 'fight'],
  'block': ['block', 'blocking', 'blocker', 'defend'],
  'damage': ['damage', 'hurt', 'hit', 'deal damage'],
  'die': ['die', 'dies', 'death', 'destroy', 'kill', 'killed'],
  'graveyard': ['graveyard', 'grave', 'discard pile', 'dead'],
  'hand': ['hand', 'cards in hand', 'draw'],
  'library': ['library', 'deck', 'cards in deck'],
  'exile': ['exile', 'exiled', 'removed', 'remove from game'],
  'tap': ['tap', 'tapped', 'untap', 'untapped'],
  'counter': ['counter', 'counters', 'counterspell', 'negate'],
  'target': ['target', 'targeting', 'targets'],
  'trigger': ['trigger', 'triggered', 'triggers', 'when', 'whenever'],
  'activate': ['activate', 'activated', 'ability', 'abilities'],
  'stack': ['stack', 'response', 'respond', 'priority'],
  'permanent': ['permanent', 'permanents', 'battlefield', 'in play'],
  'token': ['token', 'tokens', 'create token'],
  'sacrifice': ['sacrifice', 'sac', 'sacrificed'],
  'life': ['life', 'life total', 'health', 'hp'],
  'turn': ['turn', 'phase', 'step'],
  'win': ['win', 'victory', 'winning'],
  'lose': ['lose', 'loss', 'losing', 'defeat'],
};

// Expand query with synonyms
function expandQuery(query: string): string {
  let expanded = query.toLowerCase();
  
  for (const [canonical, synonyms] of Object.entries(KEYWORD_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (expanded.includes(synonym) && !expanded.includes(canonical)) {
        expanded += ` ${canonical}`;
      }
    }
  }
  
  return expanded;
}

// Extract key terms from a question
function extractKeyTerms(query: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'what', 'when', 'where',
    'which', 'who', 'whom', 'whose', 'why', 'how', 'if', 'then', 'else',
    'so', 'than', 'too', 'very', 'just', 'only', 'own', 'same', 'and',
    'but', 'or', 'nor', 'not', 'no', 'yes', 'it', 'its', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him',
    'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'about', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'under', 'again', 'further', 'once', 'here', 'there', 'all', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'any', 'both', 'and',
    'get', 'gets', 'got', 'use', 'uses', 'using', 'used', 'work', 'works',
    'please', 'tell', 'explain', 'help', 'need', 'want', 'know'
  ]);
  
  const words = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  return [...new Set(words)];
}

// Generate a helpful response based on the query and found rules
function generateResponse(query: string, rules: Rule[], _gameSystem: GameSystem): string {
  // First, try to find a pre-written explanation for this topic
  const topicExplanation = findTopicExplanation(query);
  if (topicExplanation) {
    return topicExplanation;
  }
  
  // If we have rules but no explanation, synthesize one from the best matching rule
  if (rules.length > 0) {
    const bestRule = rules[0];
    
    // Create a natural explanation from the rule
    let explanation = `**${bestRule.title}**\n\n${bestRule.text}`;
    
    // Add context if we have multiple related rules
    if (rules.length > 1) {
      explanation += `\n\n---\n*See the related rules below for more details.*`;
    }
    
    return explanation;
  }
  
  // No explanation and no rules found
  return getNoResultsResponse(query, _gameSystem);
}

function getNoResultsResponse(query: string, gameSystem: GameSystem): string {
  const keyTerms = extractKeyTerms(query);
  
  if (gameSystem === 'warhammer') {
    return `I don't have Warhammer 40K rules loaded yet. This feature is coming soon!\n\nIn the meantime, you can check the official Warhammer 40K Core Rules or your army's Codex.`;
  }
  
  if (keyTerms.length === 0) {
    return `I couldn't understand your question. Try asking about specific rules like:\n• "What is trample?"\n• "How does the stack work?"\n• "When can I cast instants?"`;
  }
  
  return `I couldn't find specific rules about "${keyTerms.join(', ')}". Try:\n• Using different keywords\n• Asking about specific mechanics\n• Checking if it's a card-specific ruling (use card search for that)`;
}

// Suggest follow-up questions based on the rules found
function getSuggestedQuestions(rules: Rule[]): string[] {
  const suggestions: string[] = [];
  const categories = new Set(rules.map(r => r.category));
  
  if (categories.has('combat')) {
    suggestions.push('How does first strike work?');
    suggestions.push('What is trample?');
  }
  if (categories.has('keywords')) {
    suggestions.push('What is hexproof?');
    suggestions.push('Explain deathtouch');
  }
  if (categories.has('spells-abilities')) {
    suggestions.push('How does the stack work?');
    suggestions.push('What are triggered abilities?');
  }
  if (categories.has('zones')) {
    suggestions.push('What zones exist in Magic?');
    suggestions.push('What does exile mean?');
  }
  if (categories.has('turn-structure')) {
    suggestions.push('What are the phases of a turn?');
    suggestions.push('When can I play lands?');
  }
  
  // Add some general suggestions
  if (suggestions.length < 3) {
    suggestions.push('What is summoning sickness?');
    suggestions.push('How do I win the game?');
    suggestions.push('What is the legendary rule?');
  }
  
  return suggestions.slice(0, 3);
}

// Main chat function
export function processRulesQuery(
  query: string,
  gameSystem: GameSystem = 'mtg'
): { response: string; rules: Rule[]; suggestions: string[] } {
  // Handle greetings
  const greetings = ['hi', 'hello', 'hey', 'help', 'start'];
  if (greetings.some(g => query.toLowerCase().trim() === g)) {
    return {
      response: `Hello! I'm your rules assistant. Ask me about ${gameSystem === 'mtg' ? 'Magic: The Gathering' : 'game'} rules.\n\nTry questions like:\n• "What is flying?"\n• "How does combat work?"\n• "When can I cast instants?"`,
      rules: [],
      suggestions: ['What is trample?', 'How does the stack work?', 'Explain deathtouch']
    };
  }
  
  // Handle Warhammer queries (placeholder)
  if (gameSystem === 'warhammer') {
    return {
      response: getNoResultsResponse(query, gameSystem),
      rules: [],
      suggestions: []
    };
  }
  
  // Expand query with synonyms
  const expandedQuery = expandQuery(query);
  
  // Search for relevant rules
  const rules = searchMTGRules(expandedQuery);
  
  // Generate response
  const response = generateResponse(query, rules, gameSystem);
  
  // Get suggestions
  const suggestions = rules.length > 0 
    ? getSuggestedQuestions(rules)
    : ['What is flying?', 'How does combat work?', 'What is the stack?'];
  
  return { response, rules, suggestions };
}

// Get all rule categories
export function getRuleCategories(gameSystem: GameSystem = 'mtg') {
  if (gameSystem === 'mtg') {
    return MTG_RULE_CATEGORIES;
  }
  return [];
}

// Get rules by category
export function getRulesByCategory(category: string, gameSystem: GameSystem = 'mtg'): Rule[] {
  if (gameSystem === 'mtg') {
    return MTG_RULES.filter(rule => rule.category === category);
  }
  return [];
}

// Quick answers for common questions - these bypass the full search
export function getQuickAnswer(query: string): string | null {
  const q = query.toLowerCase().trim();
  
  const quickAnswers: { [key: string]: string } = {
    'how many cards in a deck': '**Deck Size:**\n\n• **Standard/Modern/etc:** Minimum 60 cards (no maximum)\n• **Commander/EDH:** Exactly 100 cards\n• **Limited (Draft/Sealed):** Minimum 40 cards\n\n**Tip:** Stick close to the minimum for consistency.',
    
    'how many lands': '**Recommended Land Count:**\n\n• **60-card decks:** 20-26 lands (24 is a common starting point)\n• **40-card limited:** 16-18 lands\n• **Commander:** 35-40 lands\n\nAdjust based on your mana curve and mana-producing cards.',
    
    'starting life': '**Starting Life Totals:**\n\n• **Standard/Modern/Legacy/Vintage:** 20 life\n• **Commander:** 40 life\n• **Two-Headed Giant:** 30 life (shared)\n• **Brawl:** 25 life',
    
    'hand size': '**Hand Size Rules:**\n\n• Draw **7 cards** at game start\n• Maximum hand size is **7** (discard down during cleanup)\n• Going second? You may take a free mulligan\n• Some cards can change your maximum hand size',
    
    'how many copies': '**Copy Limits:**\n\n• **Standard formats:** Up to 4 copies of any card\n• **Basic lands:** Unlimited copies allowed\n• **Commander:** Only 1 copy of each card (singleton)\n• **Relentless Rats/etc:** Cards that say "any number" override the limit',
  };
  
  for (const [key, answer] of Object.entries(quickAnswers)) {
    if (q.includes(key)) {
      return answer;
    }
  }
  
  // Check for topic explanations as quick answers
  const topicAnswer = findTopicExplanation(query);
  if (topicAnswer) {
    return topicAnswer;
  }
  
  return null;
}
