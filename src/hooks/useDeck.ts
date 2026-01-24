import { useState, useCallback } from 'react';
import type { Deck, DeckCard, Card } from '../types';

export function useDeck(initialDeck?: Deck) {
  const [deck, setDeck] = useState<Deck>(
    initialDeck || { name: 'New Deck', cards: [], sideboard: [] }
  );

  const addCard = useCallback((card: Card, quantity: number = 1, isSideboard: boolean = false) => {
    setDeck(prev => {
      const target = isSideboard ? prev.sideboard : prev.cards;
      const existingIndex = target.findIndex(dc => dc.card.id === card.id);
      
      const newTarget = [...target];
      if (existingIndex >= 0) {
        newTarget[existingIndex] = {
          ...newTarget[existingIndex],
          quantity: newTarget[existingIndex].quantity + quantity
        };
      } else {
        newTarget.push({ card, quantity });
      }

      return {
        ...prev,
        [isSideboard ? 'sideboard' : 'cards']: newTarget
      };
    });
  }, []);

  const removeCard = useCallback((cardId: string, isSideboard: boolean = false) => {
    setDeck(prev => {
      const target = isSideboard ? prev.sideboard : prev.cards;
      return {
        ...prev,
        [isSideboard ? 'sideboard' : 'cards']: target.filter(dc => dc.card.id !== cardId)
      };
    });
  }, []);

  const updateQuantity = useCallback((cardId: string, quantity: number, isSideboard: boolean = false) => {
    if (quantity <= 0) {
      removeCard(cardId, isSideboard);
      return;
    }

    setDeck(prev => {
      const target = isSideboard ? prev.sideboard : prev.cards;
      return {
        ...prev,
        [isSideboard ? 'sideboard' : 'cards']: target.map(dc =>
          dc.card.id === cardId ? { ...dc, quantity } : dc
        )
      };
    });
  }, [removeCard]);

  const moveCard = useCallback((cardId: string, fromSideboard: boolean) => {
    setDeck(prev => {
      const source = fromSideboard ? prev.sideboard : prev.cards;
      const target = fromSideboard ? prev.cards : prev.sideboard;
      
      const cardToMove = source.find(dc => dc.card.id === cardId);
      if (!cardToMove) return prev;

      const newSource = source.filter(dc => dc.card.id !== cardId);
      const existingInTarget = target.find(dc => dc.card.id === cardId);
      
      let newTarget = [...target];
      if (existingInTarget) {
        newTarget = newTarget.map(dc =>
          dc.card.id === cardId
            ? { ...dc, quantity: dc.quantity + cardToMove.quantity }
            : dc
        );
      } else {
        newTarget.push(cardToMove);
      }

      return {
        ...prev,
        cards: fromSideboard ? newTarget : newSource,
        sideboard: fromSideboard ? newSource : newTarget
      };
    });
  }, []);

  const clearDeck = useCallback(() => {
    setDeck({ name: 'New Deck', cards: [], sideboard: [] });
  }, []);

  const setDeckName = useCallback((name: string) => {
    setDeck(prev => ({ ...prev, name }));
  }, []);

  return {
    deck,
    addCard,
    removeCard,
    updateQuantity,
    moveCard,
    clearDeck,
    setDeckName
  };
}
