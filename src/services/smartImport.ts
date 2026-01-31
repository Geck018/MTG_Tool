import { ScryfallService } from './scryfall';
import type { Card } from '../types';

export interface ImportedCard {
  name: string;
  quantity: number;
  set?: string;
  card?: Card; // Full card data from Scryfall
  status: 'found' | 'not_found' | 'ambiguous' | 'pending';
  suggestions?: Card[]; // For ambiguous matches
  originalLine: string;
}

export interface ImportResult {
  cards: ImportedCard[];
  found: number;
  notFound: number;
  ambiguous: number;
  total: number;
}

export class SmartImportService {
  // Common patterns for card lines
  private static PATTERNS = [
    // "4x Lightning Bolt" or "4 x Lightning Bolt"
    /^(\d+)\s*x\s+(.+)$/i,
    // "4 Lightning Bolt"
    /^(\d+)\s+(.+)$/,
    // "Lightning Bolt x4" or "Lightning Bolt x 4"
    /^(.+?)\s*x\s*(\d+)$/i,
    // "Lightning Bolt (4)" or "Lightning Bolt [4]"
    /^(.+?)\s*[\(\[](\d+)[\)\]]$/,
    // "Lightning Bolt, 4" or "Lightning Bolt - 4"
    /^(.+?)\s*[,\-]\s*(\d+)$/,
    // Just card name (quantity = 1)
    /^(.+)$/
  ];

  // Words/sections to skip
  private static SKIP_PATTERNS = [
    /^(sideboard|mainboard|main deck|main|deck|sb|mb|creatures?|lands?|spells?|instants?|sorceries|enchantments?|artifacts?|planeswalkers?|commander|companion):?$/i,
    /^#+\s/, // Markdown headers
    /^\/\//, // Comments
    /^\s*$/, // Empty lines
    /^---+$/, // Separators
    /^===+$/, // Separators
  ];

  /**
   * Parse any text input and extract card names with quantities
   */
  static parseInput(text: string): { name: string; quantity: number; set?: string; originalLine: string }[] {
    const lines = text.split('\n');
    const results: { name: string; quantity: number; set?: string; originalLine: string }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      
      // Skip empty lines and section headers
      if (this.shouldSkipLine(line)) continue;

      // Try to parse set code if present: "Lightning Bolt (LEB)" or "Lightning Bolt [LEB]"
      let set: string | undefined;
      let cleanLine = line;
      
      const setMatch = line.match(/^(.+?)\s*[\(\[]([A-Z0-9]{2,5})[\)\]]\s*$/i);
      if (setMatch) {
        cleanLine = setMatch[1].trim();
        set = setMatch[2].toUpperCase();
      }

      // Also check for set at end after quantity: "4x Lightning Bolt LEB"
      const setEndMatch = cleanLine.match(/^(.+?)\s+([A-Z0-9]{2,5})$/i);
      if (setEndMatch && !set) {
        // Verify it looks like a set code (2-5 uppercase letters/numbers)
        const possibleSet = setEndMatch[2];
        if (/^[A-Z0-9]{2,5}$/.test(possibleSet)) {
          // Don't match common card name endings
          const commonEndings = ['II', 'III', 'IV', 'OF', 'THE', 'AND'];
          if (!commonEndings.includes(possibleSet.toUpperCase())) {
            cleanLine = setEndMatch[1].trim();
            set = possibleSet.toUpperCase();
          }
        }
      }

      // Try each pattern
      let matched = false;
      for (const pattern of this.PATTERNS) {
        const match = cleanLine.match(pattern);
        if (match) {
          // Determine which group is quantity and which is name
          let name: string;
          let quantity: number;

          if (match.length === 3) {
            // First check if first group looks like a number
            if (/^\d+$/.test(match[1])) {
              quantity = parseInt(match[1], 10);
              name = match[2];
            } else {
              name = match[1];
              quantity = parseInt(match[2], 10);
            }
          } else {
            // Just card name, quantity = 1
            name = match[1];
            quantity = 1;
          }

          name = this.cleanCardName(name);
          
          if (name && name.length >= 2) {
            results.push({ name, quantity, set, originalLine: rawLine });
            matched = true;
            break;
          }
        }
      }

      // If no pattern matched but line has content, try as card name
      if (!matched && cleanLine.length >= 2) {
        const name = this.cleanCardName(cleanLine);
        if (name) {
          results.push({ name, quantity: 1, set, originalLine: rawLine });
        }
      }
    }

    return results;
  }

  /**
   * Clean up a card name
   */
  private static cleanCardName(name: string): string {
    return name
      .replace(/^\d+\s*x?\s*/i, '') // Remove leading quantity
      .replace(/\s*x?\s*\d+$/i, '') // Remove trailing quantity
      .replace(/[\(\[].*?[\)\]]/g, '') // Remove parenthetical content
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/^["\']|["\']$/g, '') // Remove quotes
      .trim();
  }

  /**
   * Check if a line should be skipped
   */
  private static shouldSkipLine(line: string): boolean {
    if (!line) return true;
    return this.SKIP_PATTERNS.some(pattern => pattern.test(line));
  }

  /**
   * Process parsed cards through Scryfall to verify and get full data
   */
  static async processCards(
    parsedCards: { name: string; quantity: number; set?: string; originalLine: string }[],
    onProgress?: (current: number, total: number, cardName: string) => void
  ): Promise<ImportResult> {
    const results: ImportedCard[] = [];
    let found = 0;
    let notFound = 0;
    let ambiguous = 0;

    // Batch process to reduce API calls
    const batchSize = 10;
    
    for (let i = 0; i < parsedCards.length; i += batchSize) {
      const batch = parsedCards.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (parsed) => {
        onProgress?.(i + batch.indexOf(parsed) + 1, parsedCards.length, parsed.name);
        
        try {
          // First try exact name match
          const exactCard = await ScryfallService.getCardByName(parsed.name, parsed.set);
          
          if (exactCard) {
            found++;
            return {
              name: exactCard.name, // Use official name
              quantity: parsed.quantity,
              set: parsed.set,
              card: exactCard,
              status: 'found' as const,
              originalLine: parsed.originalLine
            };
          }

          // If exact match fails, search for the card
          const searchResults = await ScryfallService.searchCard(parsed.name);
          
          if (searchResults.length === 0) {
            notFound++;
            return {
              name: parsed.name,
              quantity: parsed.quantity,
              set: parsed.set,
              status: 'not_found' as const,
              originalLine: parsed.originalLine
            };
          } else if (searchResults.length === 1) {
            // Single result - use it
            found++;
            return {
              name: searchResults[0].name,
              quantity: parsed.quantity,
              set: parsed.set,
              card: searchResults[0],
              status: 'found' as const,
              originalLine: parsed.originalLine
            };
          } else {
            // Check if first result is an exact match (case insensitive)
            const exactMatch = searchResults.find(
              c => c.name.toLowerCase() === parsed.name.toLowerCase()
            );
            
            if (exactMatch) {
              found++;
              return {
                name: exactMatch.name,
                quantity: parsed.quantity,
                set: parsed.set,
                card: exactMatch,
                status: 'found' as const,
                originalLine: parsed.originalLine
              };
            }
            
            // Multiple ambiguous results
            ambiguous++;
            return {
              name: parsed.name,
              quantity: parsed.quantity,
              set: parsed.set,
              status: 'ambiguous' as const,
              suggestions: searchResults.slice(0, 5),
              originalLine: parsed.originalLine
            };
          }
        } catch (error) {
          console.error(`Error processing card "${parsed.name}":`, error);
          notFound++;
          return {
            name: parsed.name,
            quantity: parsed.quantity,
            set: parsed.set,
            status: 'not_found' as const,
            originalLine: parsed.originalLine
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < parsedCards.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      cards: results,
      found,
      notFound,
      ambiguous,
      total: parsedCards.length
    };
  }

  /**
   * Full import: parse input and process through Scryfall
   */
  static async importCards(
    text: string,
    onProgress?: (current: number, total: number, cardName: string) => void
  ): Promise<ImportResult> {
    const parsed = this.parseInput(text);
    
    if (parsed.length === 0) {
      return { cards: [], found: 0, notFound: 0, ambiguous: 0, total: 0 };
    }

    return this.processCards(parsed, onProgress);
  }
}
