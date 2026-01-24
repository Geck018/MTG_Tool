import type { Card, CardRuling } from '../types';

const SCRYFALL_API = 'https://api.scryfall.com';

export class ScryfallService {
  private static cache = new Map<string, Card>();

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
    const cacheKey = `${name}${set ? `:${set}` : ''}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      let url = `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`;
      if (set) {
        url += `&set=${encodeURIComponent(set)}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        return null;
      }

      const card = await response.json();
      this.cache.set(cacheKey, card);
      return card;
    } catch (error) {
      console.error('Error fetching card:', error);
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
