import type { KeywordRule } from '../types';

// Comprehensive Rules keyword definitions
// This is a simplified version - in production, you'd want to fetch the full rules
export const KEYWORD_RULES: KeywordRule[] = [
  {
    keyword: 'Flying',
    definition: 'This creature can only be blocked by creatures with flying or reach.',
    reminder: 'Flying creatures can only be blocked by creatures with flying or reach.'
  },
  {
    keyword: 'Trample',
    definition: 'This creature can deal excess combat damage to the player or planeswalker it\'s attacking.',
    reminder: 'Trample allows a creature to deal excess combat damage to the player or planeswalker it\'s attacking.'
  },
  {
    keyword: 'Haste',
    definition: 'This creature can attack and tap the turn it comes under your control.',
    reminder: 'Haste allows a creature to attack and tap the turn it comes under your control.'
  },
  {
    keyword: 'Vigilance',
    definition: 'Attacking doesn\'t cause this creature to tap.',
    reminder: 'Vigilance allows a creature to attack without tapping.'
  },
  {
    keyword: 'First Strike',
    definition: 'This creature deals combat damage before creatures without first strike.',
    reminder: 'First strike allows a creature to deal combat damage before creatures without first strike.'
  },
  {
    keyword: 'Double Strike',
    definition: 'This creature deals both first-strike and regular combat damage.',
    reminder: 'Double strike allows a creature to deal both first-strike and regular combat damage.'
  },
  {
    keyword: 'Deathtouch',
    definition: 'Any amount of damage this deals to a creature is enough to destroy it.',
    reminder: 'Deathtouch causes any amount of damage dealt to a creature to be enough to destroy it.'
  },
  {
    keyword: 'Lifelink',
    definition: 'Damage dealt by this creature also causes you to gain that much life.',
    reminder: 'Lifelink causes you to gain life equal to the damage dealt by this creature.'
  },
  {
    keyword: 'Reach',
    definition: 'This creature can block creatures with flying.',
    reminder: 'Reach allows a creature to block creatures with flying.'
  },
  {
    keyword: 'Hexproof',
    definition: 'This permanent can\'t be the target of spells or abilities your opponents control.',
    reminder: 'Hexproof prevents this permanent from being targeted by opponents.'
  },
  {
    keyword: 'Shroud',
    definition: 'This permanent can\'t be the target of spells or abilities.',
    reminder: 'Shroud prevents this permanent from being targeted by any spells or abilities.'
  },
  {
    keyword: 'Indestructible',
    definition: 'Effects that say "destroy" don\'t destroy this permanent. A creature with indestructible can\'t be destroyed by damage.',
    reminder: 'Indestructible prevents destruction and damage-based destruction.'
  },
  {
    keyword: 'Flash',
    definition: 'You may cast this spell any time you could cast an instant.',
    reminder: 'Flash allows you to cast this spell at instant speed.'
  },
  {
    keyword: 'Menace',
    definition: 'This creature can\'t be blocked except by two or more creatures.',
    reminder: 'Menace requires two or more creatures to block.'
  },
  {
    keyword: 'Ward',
    definition: 'Whenever this permanent becomes the target of a spell or ability an opponent controls, counter it unless that player pays the ward cost.',
    reminder: 'Ward requires opponents to pay a cost when targeting this permanent.'
  }
];

export class KeywordAnalyzer {
  static analyzeCard(cardText: string): string[] {
    const foundKeywords: string[] = [];
    const lowerText = cardText.toLowerCase();

    for (const rule of KEYWORD_RULES) {
      const keywordLower = rule.keyword.toLowerCase();
      if (lowerText.includes(keywordLower)) {
        foundKeywords.push(rule.keyword);
      }
    }

    return foundKeywords;
  }

  static getKeywordDefinition(keyword: string): KeywordRule | undefined {
    return KEYWORD_RULES.find(rule => 
      rule.keyword.toLowerCase() === keyword.toLowerCase()
    );
  }

  static getAllKeywords(): KeywordRule[] {
    return KEYWORD_RULES;
  }

  static explainKeywords(keywords: string[]): string {
    const explanations = keywords
      .map(keyword => {
        const rule = this.getKeywordDefinition(keyword);
        return rule ? `${rule.keyword}: ${rule.definition}` : null;
      })
      .filter(Boolean) as string[];

    return explanations.join('\n\n');
  }
}
