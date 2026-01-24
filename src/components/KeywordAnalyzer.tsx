import { useState } from 'react';
import type { Deck } from '../types';
import { KeywordAnalyzer as Analyzer } from '../services/keywords';

interface KeywordAnalyzerProps {
  deck: Deck;
}

export function KeywordAnalyzer({ deck }: KeywordAnalyzerProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  
  const allCards = [...deck.cards, ...deck.sideboard];
  const keywordMap = new Map<string, number>();

  // Collect all keywords from deck
  for (const deckCard of allCards) {
    const card = deckCard.card;
    const text = card.oracle_text || '';
    const keywords = Analyzer.analyzeCard(text);
    
    for (const keyword of keywords) {
      const current = keywordMap.get(keyword) || 0;
      keywordMap.set(keyword, current + deckCard.quantity);
    }
  }

  const keywords = Array.from(keywordMap.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      definition: Analyzer.getKeywordDefinition(keyword)
    }))
    .filter(k => k.definition)
    .sort((a, b) => b.count - a.count);

  const allKeywordRules = Analyzer.getAllKeywords();

  return (
    <div className="validation-result">
      <h2 className="panel-title">Keyword Analysis</h2>

      {keywords.length > 0 ? (
        <>
          <div style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            Found {keywords.length} unique keywords in your deck
          </div>

          <div className="keyword-list">
            {keywords.map(({ keyword, count, definition }) => (
              <div key={keyword} className="keyword-card">
                <div className="keyword-name">
                  {keyword} ({count}x)
                </div>
                {definition && (
                  <div className="keyword-definition">
                    {definition.definition}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div>No keywords found in your deck</div>
        </div>
      )}

      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
        <h3 className="validation-section-title">All Available Keywords</h3>
        <div className="keyword-list">
          {allKeywordRules.map((rule) => (
            <div
              key={rule.keyword}
              className="keyword-card"
              style={{
                cursor: 'pointer',
                borderColor: selectedKeyword === rule.keyword ? 'var(--accent)' : undefined
              }}
              onClick={() => setSelectedKeyword(selectedKeyword === rule.keyword ? null : rule.keyword)}
            >
              <div className="keyword-name">{rule.keyword}</div>
              <div className="keyword-definition">
                {rule.definition}
              </div>
              {rule.reminder && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {rule.reminder}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
