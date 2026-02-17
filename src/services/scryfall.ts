import type { Card, CardRuling } from '../types';

const SCRYFALL_API = 'https://api.scryfall.com';

export class ScryfallService {
  private static cache = new Map<string, Card>();
  private static localStorageCache = 'scryfall_card_cache';
  private static cacheInitialized = false;

  // Initialize cache from localStorage on first use
  private static initCache() {
    if (this.cacheInitialized) return;
    try {
      const cached = localStorage.getItem(this.localStorageCache);
      if (cached) {
        const parsed = JSON.parse(cached);
        for (const [key, value] of Object.entries(parsed)) {
          this.cache.set(key, value as Card);
        }
      }
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
    }
    this.cacheInitialized = true;
  }

  // Save cache to localStorage periodically
  private static saveCache() {
    try {
      const cacheObj: Record<string, Card> = {};
      this.cache.forEach((value, key) => {
        cacheObj[key] = value;
      });
      // Limit cache size to 5MB (roughly 5000 cards)
      const cacheStr = JSON.stringify(cacheObj);
      if (cacheStr.length < 5 * 1024 * 1024) {
        localStorage.setItem(this.localStorageCache, cacheStr);
      }
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }

  static async searchCard(query: string): Promise<Card[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `${SCRYFALL_API}/cards/search?q=${encodedQuery}&unique=cards&order=released`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Scryfall API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error searching cards:', error);
      return [];
    }
  }

  static async getCardByName(name: string, set?: string): Promise<Card | null> {
    this.initCache();
    const cacheKey = `${name}${set ? `:${set}` : ''}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Also check cache without set
    if (set && this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    try {
      // Only use set parameter if it looks like a set code (2-5 alphanumeric chars)
      const isSetCode = set && /^[a-zA-Z0-9]{2,5}$/.test(set);
      
      let url = `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`;
      if (isSetCode) {
        url += `&set=${encodeURIComponent(set.toLowerCase())}`;
      }

      let response = await fetch(url);
      
      // If failed with set code, retry without it
      if (!response.ok && isSetCode) {
        url = `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`;
        response = await fetch(url);
      }
      
      // If exact match fails, try fuzzy search
      if (!response.ok) {
        url = `${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(name)}`;
        response = await fetch(url);
      }
      
      if (!response.ok) {
        return null;
      }

      const card = await response.json();
      this.cache.set(cacheKey, card);
      this.cache.set(name, card); // Also cache without set
      // Save cache periodically (every 10 cards)
      if (this.cache.size % 10 === 0) {
        this.saveCache();
      }
      return card;
    } catch (error) {
      console.error('Error fetching card:', error);
      return null;
    }
  }

  // Batch fetch multiple cards by name (parallel requests)
  // Accepts either a single set for all cards, or a map of name->set for individual sets
  static async getCardsByName(
    names: string[], 
    set?: string | Map<string, string>, 
    batchSize: number = 20
  ): Promise<Map<string, Card>> {
    this.initCache();
    const results = new Map<string, Card>();
    const uncached: Array<{ name: string; set?: string }> = [];
    const setMap = set instanceof Map ? set : undefined;
    const defaultSet = set instanceof Map ? undefined : set;

    // Check cache first
    for (const name of names) {
      const cardSet = setMap?.get(name) || defaultSet;
      const cacheKey = `${name}${cardSet ? `:${cardSet}` : ''}`;
      if (this.cache.has(cacheKey)) {
        results.set(name, this.cache.get(cacheKey)!);
      } else if (this.cache.has(name)) {
        // Try cache without set
        results.set(name, this.cache.get(name)!);
      } else {
        uncached.push({ name, set: cardSet });
      }
    }

    // Fetch uncached cards in parallel batches
    for (let i = 0; i < uncached.length; i += batchSize) {
      const batch = uncached.slice(i, i + batchSize);
      const promises = batch.map(({ name, set: cardSet }) => this.getCardByName(name, cardSet));
      const batchResults = await Promise.all(promises);
      
      batchResults.forEach((card, index) => {
        if (card) {
          results.set(batch[index].name, card);
        }
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < uncached.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /** Fetch a single card by Scryfall ID (e.g. from API deck cards). */
  static async getCardById(scryfallId: string): Promise<Card | null> {
    this.initCache();
    if (this.cache.has(scryfallId)) {
      return this.cache.get(scryfallId)!;
    }
    try {
      const response = await fetch(`${SCRYFALL_API}/cards/${encodeURIComponent(scryfallId)}`);
      if (!response.ok) return null;
      const card = await response.json();
      this.cache.set(scryfallId, card);
      this.saveCache();
      return card;
    } catch (error) {
      console.error('Error fetching card by id:', error);
      return null;
    }
  }

  static async getCardBySetAndNumber(set: string, number: string): Promise<Card | null> {
    try {
      const response = await fetch(
        `${SCRYFALL_API}/cards/${set}/${number}`
      );
      
      if (!response.ok) {
        return null;
      }

      const card = await response.json();
      return card;
    } catch (error) {
      console.error('Error fetching card by set/number:', error);
      return null;
    }
  }

  static async getBulkData(): Promise<any[]> {
    try {
      const response = await fetch(`${SCRYFALL_API}/bulk-data`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching bulk data:', error);
      return [];
    }
  }

  static async getCardRulings(cardId: string): Promise<CardRuling[]> {
    try {
      const response = await fetch(`${SCRYFALL_API}/cards/${cardId}/rulings`);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching rulings:', error);
      return [];
    }
  }

  static async getRelatedCards(cardName: string, oracleText?: string): Promise<Card[]> {
    try {
      // Search for cards that might synergize based on keywords and mechanics
      if (!oracleText) return [];

      // Extract key terms from oracle text
      const keywords = oracleText
        .toLowerCase()
        .match(/\b(draw|discard|sacrifice|destroy|exile|counter|return|tap|untap|creature|artifact|enchantment|land|planeswalker|instant|sorcery)\w*\b/g) || [];

      if (keywords.length === 0) return [];

      // Build a search query
      const searchTerms = [...new Set(keywords)].slice(0, 3);
      const query = searchTerms.join(' OR ');

      const response = await fetch(
        `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=released`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      // Filter out the card itself and return top 5
      return (data.data || [])
        .filter((card: Card) => card.name !== cardName)
        .slice(0, 5);
    } catch (error) {
      console.error('Error fetching related cards:', error);
      return [];
    }
  }
}
