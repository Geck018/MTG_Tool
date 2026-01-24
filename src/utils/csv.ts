import type { BulkCard, DeckCard } from '../types';
import { ScryfallService } from '../services/scryfall';

export class CSVService {
  static parseBulkCSV(csvText: string): BulkCard[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    // Parse header row using the same CSV parser to handle quotes correctly
    const headerValues = this.parseCSVLine(lines[0]);
    const headers = headerValues.map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    
    const cardMap = new Map<string, BulkCard>(); // Group by name to sum quantities
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      let cardName = '';
      let quantity = 1;
      let set = '';
      let collectorNumber = '';

      headers.forEach((header, index) => {
        // Remove quotes from values
        const value = (values[index] || '').trim().replace(/^"|"$/g, '');
        
        if (header.includes('card name') || (header.includes('name') && !header.includes('set') && !header.includes('container'))) {
          cardName = value;
        } else if (header.includes('quantity') || header.includes('qty') || header.includes('count')) {
          quantity = parseInt(value) || 1;
        } else if (header.includes('set code')) {
          set = value;
        } else if (header.includes('set name') && !set) {
          // Use set name if set code not available
          set = value;
        } else if (header.includes('collector number') || (header.includes('number') && !header.includes('set') && !header.includes('price'))) {
          collectorNumber = value;
        }
      });

      if (cardName) {
        // Group cards by name (case-insensitive) and sum quantities
        const key = cardName.toLowerCase();
        if (cardMap.has(key)) {
          const existing = cardMap.get(key)!;
          existing.quantity += quantity;
        } else {
          cardMap.set(key, {
            name: cardName,
            quantity,
            set: set || undefined,
            collector_number: collectorNumber || undefined
          });
        }
      }
    }

    return Array.from(cardMap.values());
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
    // MythicTools format header
    const lines = ['Card Name,Set Code,Set Name,Collector Number,Rarity,Language,Quantity,Condition,Finish,Altered,Signed,Misprint,Price (USD),Price (EUR),Price (USD Foil),Price (EUR Foil),Price (USD Etched),Price (EUR Etched),Scryfall ID,Container Type,Container Name,Status'];
    
    // Add deck cards (not in wishlist)
    for (const deckCard of allCards) {
      if (!wishlistCardIds.has(deckCard.card.id)) {
        const card = deckCard.card;
        const name = `"${card.name}"`;
        const setCode = card.set_name ? this.getSetCode(card.set_name) : '';
        const setName = `"${card.set_name || ''}"`;
        const collectorNumber = card.collector_number || '';
        const rarity = card.rarity || 'unknown';
        const language = 'en';
        const quantity = deckCard.quantity;
        const condition = 'NM';
        const finish = 'nonfoil';
        const altered = 'false';
        const signed = 'false';
        const misprint = 'false';
        const priceUsd = card.prices?.usd || '0';
        const priceEur = '0';
        const priceUsdFoil = card.prices?.usd_foil || '0';
        const priceEurFoil = '0';
        const priceUsdEtched = '0';
        const priceEurEtched = '0';
        const scryfallId = card.id || '';
        const containerType = 'deck';
        const containerName = 'Main Deck';
        const status = 'In Deck';
        
        lines.push(`${name},${setCode},${setName},${collectorNumber},${rarity},${language},${quantity},${condition},${finish},${altered},${signed},${misprint},${priceUsd},${priceEur},${priceUsdFoil},${priceEurFoil},${priceUsdEtched},${priceEurEtched},${scryfallId},${containerType},${containerName},${status}`);
      }
    }

    // Add wishlist cards
    for (const wishlistCard of wishlist) {
      const card = wishlistCard.card;
      const name = `"${card.name}"`;
      const setCode = card.set_name ? this.getSetCode(card.set_name) : '';
      const setName = `"${card.set_name || ''}"`;
      const collectorNumber = card.collector_number || '';
      const rarity = card.rarity || 'unknown';
      const language = 'en';
      const quantity = wishlistCard.quantity;
      const condition = 'NM';
      const finish = 'nonfoil';
      const altered = 'false';
      const signed = 'false';
      const misprint = 'false';
      const priceUsd = card.prices?.usd || '0';
      const priceEur = '0';
      const priceUsdFoil = card.prices?.usd_foil || '0';
      const priceEurFoil = '0';
      const priceUsdEtched = '0';
      const priceEurEtched = '0';
      const scryfallId = card.id || '';
      const containerType = 'wishlist';
      const containerName = 'Wishlist';
      const status = 'Wishlist';
      
      lines.push(`${name},${setCode},${setName},${collectorNumber},${rarity},${language},${quantity},${condition},${finish},${altered},${signed},${misprint},${priceUsd},${priceEur},${priceUsdFoil},${priceEurFoil},${priceUsdEtched},${priceEurEtched},${scryfallId},${containerType},${containerName},${status}`);
    }

    return lines.join('\n');
  }

  private static getSetCode(setName: string): string {
    // Common set code mappings - this is a simplified version
    // In production, you'd want a full mapping or fetch from Scryfall
    const setCodeMap: { [key: string]: string } = {
      'Adventures in the Forgotten Realms': 'afr',
      'The Brothers\' War': 'bro',
      'Commander 2013': 'c13',
      'Commander 2019': 'c19',
      'Champions of Kamigawa': 'chk',
      'Commander Anthology': 'cma',
      'Dominaria United': 'dmu',
      'Duskmourn: House of Horror': 'dsk',
      'Lorwyn Eclipsed': 'ecl',
      'Guilds of Ravnica': 'grn',
      'Hour of Devastation': 'hou',
      'Iconic Masters': 'ima',
      'Innistrad Remastered': 'inr',
      'Innistrad: Midnight Hunt': 'mid',
      'Murders at Karlov Manor': 'mkm',
      'Ravnica: City of Guilds': 'rav',
      'Ravnica Allegiance': 'rna',
      'Rise of the Eldrazi': 'roe',
      'Return to Ravnica': 'rtr',
      'Shadowmoor': 'shm',
      'Marvel\'s Spider-Man': 'spm',
      'Strixhaven: School of Mages': 'stx',
      'Theros Beyond Death': 'thb',
      'Avatar: The Last Airbender': 'tla',
      'Time Spiral': 'tsp',
      'Wilds of Eldraine': 'woe',
      'Ixalan': 'xln'
    };

    // Try exact match first
    if (setCodeMap[setName]) {
      return setCodeMap[setName];
    }

    // Try case-insensitive match
    const lowerName = setName.toLowerCase();
    for (const [key, code] of Object.entries(setCodeMap)) {
      if (key.toLowerCase() === lowerName) {
        return code;
      }
    }

    // Fallback: generate a short code from the name
    return setName
      .split(' ')
      .map(word => word.substring(0, 3).toLowerCase())
      .join('')
      .substring(0, 3);
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
