import { searchMTGRules, MTG_RULES, MTG_RULE_CATEGORIES, type Rule } from './mtgRules';

export type GameSystem = 'mtg' | 'warhammer' | 'general';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rules?: Rule[];
  timestamp: Date;
}

interface QuestionPattern {
  patterns: RegExp[];
  keywords: string[];
  response: (matches: RegExpMatchArray | null, query: string) => string;
}

// Common question patterns for natural language understanding
const QUESTION_PATTERNS: QuestionPattern[] = [
  {
    patterns: [
      /what\s+(?:is|are|does)\s+(.+)/i,
      /explain\s+(.+)/i,
      /define\s+(.+)/i,
      /how\s+does\s+(.+)\s+work/i,
    ],
    keywords: [],
    response: (matches, query) => {
      const topic = matches?.[1]?.trim() || query;
      return `Here's what I found about "${topic}":`;
    }
  },
  {
    patterns: [
      /can\s+(?:i|you|a player)\s+(.+)/i,
      /is\s+it\s+(?:possible|legal)\s+to\s+(.+)/i,
    ],
    keywords: [],
    response: (matches, query) => {
      return `Regarding "${matches?.[1]?.trim() || query}":`;
    }
  },
  {
    patterns: [
      /when\s+(?:can|do|does)\s+(.+)/i,
      /what\s+happens\s+(?:when|if)\s+(.+)/i,
    ],
    keywords: [],
    response: () => `Here are the relevant rules:`
  },
  {
    patterns: [
      /how\s+(?:many|much)\s+(.+)/i,
    ],
    keywords: [],
    response: () => `Here's the information:`
  },
  {
    patterns: [
      /difference\s+between\s+(.+)\s+and\s+(.+)/i,
    ],
    keywords: [],
    response: (matches) => `Comparing ${matches?.[1]} and ${matches?.[2]}:`
  },
];

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
function generateResponse(query: string, rules: Rule[], gameSystem: GameSystem): string {
  if (rules.length === 0) {
    return getNoResultsResponse(query, gameSystem);
  }
  
  // Check for pattern matches
  for (const pattern of QUESTION_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = query.match(regex);
      if (match) {
        return pattern.response(match, query);
      }
    }
  }
  
  // Default response
  const keyTerms = extractKeyTerms(query);
  if (keyTerms.length > 0) {
    return `Here's what I found about "${keyTerms.slice(0, 3).join(', ')}":`;
  }
  
  return "Here are the relevant rules:";
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

// Quick answers for common questions
export function getQuickAnswer(query: string): string | null {
  const q = query.toLowerCase().trim();
  
  const quickAnswers: { [key: string]: string } = {
    'how many cards in a deck': 'A standard Magic deck must have at least 60 cards. Commander decks have exactly 100 cards.',
    'how many lands': 'Most 60-card decks run 20-26 lands. A common starting point is 24 lands (40% of deck).',
    'starting life': 'Players start with 20 life in most formats. Commander starts with 40 life.',
    'hand size': 'You draw 7 cards at the start. Maximum hand size is 7 (discard at end of turn if over).',
    'how many copies': 'You can have up to 4 copies of any card except basic lands. Commander is singleton (1 copy each).',
    'what is edh': 'EDH (Elder Dragon Highlander) is another name for Commander format.',
    'what is commander': 'Commander is a 100-card singleton format with a legendary creature as your commander.',
  };
  
  for (const [key, answer] of Object.entries(quickAnswers)) {
    if (q.includes(key)) {
      return answer;
    }
  }
  
  return null;
}
