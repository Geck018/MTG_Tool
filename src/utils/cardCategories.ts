import type { Card } from '../types';

export type CardCategory = 
  | 'Basic Land'
  | 'Nonbasic Land'
  | 'Artifact'
  | 'Creature'
  | 'Planeswalker'
  | 'Instant'
  | 'Sorcery'
  | 'Enchantment'
  | 'Other';

const BASIC_LANDS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];

export function getCardCategory(card: Card): CardCategory {
  const typeLine = card.type_line.toLowerCase();
  
  // Check for basic lands first
  if (BASIC_LANDS.includes(card.name)) {
    return 'Basic Land';
  }
  
  // Check for nonbasic lands
  if (typeLine.includes('land')) {
    return 'Nonbasic Land';
  }
  
  // Check for other types
  if (typeLine.includes('creature')) {
    return 'Creature';
  }
  
  if (typeLine.includes('planeswalker')) {
    return 'Planeswalker';
  }
  
  if (typeLine.includes('instant')) {
    return 'Instant';
  }
  
  if (typeLine.includes('sorcery')) {
    return 'Sorcery';
  }
  
  if (typeLine.includes('enchantment')) {
    return 'Enchantment';
  }
  
  if (typeLine.includes('artifact')) {
    return 'Artifact';
  }
  
  return 'Other';
}

export function getCategoryOrder(category: CardCategory): number {
  const order: Record<CardCategory, number> = {
    'Basic Land': 1,
    'Nonbasic Land': 2,
    'Creature': 3,
    'Planeswalker': 4,
    'Artifact': 5,
    'Enchantment': 6,
    'Instant': 7,
    'Sorcery': 8,
    'Other': 9
  };
  return order[category];
}

export const ALL_CATEGORIES: CardCategory[] = [
  'Basic Land',
  'Nonbasic Land',
  'Creature',
  'Planeswalker',
  'Artifact',
  'Enchantment',
  'Instant',
  'Sorcery',
  'Other'
];
