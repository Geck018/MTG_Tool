import type { BulkCard, DeckCard } from '../types';
import { ScryfallService } from '../services/scryfall';

export class CSVService {
  static parseBulkCSV(csvText: string): BulkCard[] {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const cards: BulkCard[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const card: BulkCard = {
        name: '',
        quantity: 1
      };

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        
        if (header.includes('name') || header.includes('card')) {
          card.name = value;
        } else if (header.includes('quantity') || header.includes('qty') || header.includes('count')) {
          card.quantity = parseInt(value) || 1;
        } else if (header.includes('set') || header.includes('edition')) {
          card.set = value;
        } else if (header.includes('number') || header.includes('collector')) {
          card.collector_number = value;
        }
      });

      if (card.name) {
        cards.push(card);
      }
    }

    return cards;
  }

  static async parseDeckCSV(csvText: string): Promise<DeckCard[]> {
    const lines = csvText.trim().split('\n');
    const deckCards: DeckCard[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Try to parse formats like: "2 Lightning Bolt" or "2x Lightning Bolt"
      const match = line.match(/^(\d+)\s*x?\s*(.+)$/);
      if (match) {
        const quantity = parseInt(match[1]);
        const cardName = match[2].trim();
        
        const card = await ScryfallService.getCardByName(cardName);
        if (card) {
          deckCards.push({ card, quantity });
        }
      }
    }

    return deckCards;
  }

  static exportToCSV(cards: DeckCard[]): string {
    const lines = ['Name,Quantity,Set,Collector Number,CMC,Type,Colors'];
    
    for (const deckCard of cards) {
      const card = deckCard.card;
      const name = `"${card.name}"`;
      const quantity = deckCard.quantity;
      const set = card.set_name || '';
      const collectorNumber = card.collector_number || '';
      const cmc = card.cmc || 0;
      const type = `"${card.type_line}"`;
      const colors = card.colors.join('') || 'Colorless';
      
      lines.push(`${name},${quantity},${set},${collectorNumber},${cmc},${type},${colors}`);
    }

    return lines.join('\n');
  }

  static exportToCSVWithWishlist(allCards: DeckCard[], wishlist: DeckCard[]): string {
    const wishlistCardIds = new Set(wishlist.map(wc => wc.card.id));
    const lines = ['Name,Quantity,Set,Collector Number,CMC,Type,Colors,Status'];
    
    // Add deck cards (not in wishlist)
    for (const deckCard of allCards) {
      if (!wishlistCardIds.has(deckCard.card.id)) {
        const card = deckCard.card;
        const name = `"${card.name}"`;
        const quantity = deckCard.quantity;
        const set = card.set_name || '';
        const collectorNumber = card.collector_number || '';
        const cmc = card.cmc || 0;
        const type = `"${card.type_line}"`;
        const colors = card.colors.join('') || 'Colorless';
        const status = 'In Deck';
        
        lines.push(`${name},${quantity},${set},${collectorNumber},${cmc},${type},${colors},${status}`);
      }
    }

    // Add wishlist cards
    for (const wishlistCard of wishlist) {
      const card = wishlistCard.card;
      const name = `"${card.name}"`;
      const quantity = wishlistCard.quantity;
      const set = card.set_name || '';
      const collectorNumber = card.collector_number || '';
      const cmc = card.cmc || 0;
      const type = `"${card.type_line}"`;
      const colors = card.colors.join('') || 'Colorless';
      const status = 'Wishlist';
      
      lines.push(`${name},${quantity},${set},${collectorNumber},${cmc},${type},${colors},${status}`);
    }

    return lines.join('\n');
  }

  static exportBulkToCSV(cards: BulkCard[]): string {
    const lines = ['Name,Quantity,Set,Collector Number'];
    
    for (const bulkCard of cards) {
      const name = `"${bulkCard.name}"`;
      const quantity = bulkCard.quantity;
      const set = bulkCard.set || '';
      const collectorNumber = bulkCard.collector_number || '';
      
      lines.push(`${name},${quantity},${set},${collectorNumber}`);
    }

    return lines.join('\n');
  }

  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current);
    return values;
  }
}
