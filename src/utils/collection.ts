import type { BulkCard } from '../types';

export class CollectionService {
  static getBulkCollection(): BulkCard[] {
    try {
      const stored = localStorage.getItem('mtg_bulk_collection');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading bulk collection:', error);
      return [];
    }
  }

  static hasCard(cardName: string, quantity: number = 1): boolean {
    const collection = this.getBulkCollection();
    const card = collection.find(
      bc => bc.name.toLowerCase() === cardName.toLowerCase()
    );
    return card ? card.quantity >= quantity : false;
  }

  static getCardQuantity(cardName: string): number {
    const collection = this.getBulkCollection();
    const card = collection.find(
      bc => bc.name.toLowerCase() === cardName.toLowerCase()
    );
    return card ? card.quantity : 0;
  }

  static getMissingCards(deckCards: Array<{ card: { name: string }; quantity: number }>): Array<{ name: string; needed: number; have: number; missing: number }> {
    const missing: Array<{ name: string; needed: number; have: number; missing: number }> = [];

    for (const deckCard of deckCards) {
      const cardName = deckCard.card.name;
      const needed = deckCard.quantity;
      const have = this.getCardQuantity(cardName);
      const missingCount = Math.max(0, needed - have);

      if (missingCount > 0) {
        missing.push({
          name: cardName,
          needed,
          have,
          missing: missingCount
        });
      }
    }

    return missing;
  }
}
