import { useState, useEffect } from 'react';
import type { Deck, DeckCard } from '../types';
import { DeckAnalysisService, type DeckAnalysisResult } from '../services/deckAnalysis';
import { useAuth } from '../contexts/AuthContext';
import { userApi, deckApi } from '../services/api';
import { ScryfallService } from '../services/scryfall';
import type { UserDeck } from '../database/types';

export function DeckAnalysis() {
  const { user } = useAuth();
  const [myDecks, setMyDecks] = useState<UserDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | ''>('');
  const [loadedDeck, setLoadedDeck] = useState<Deck | null>(null);
  const [decksLoading, setDecksLoading] = useState(true);
  const [deckLoading, setDeckLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState('standard');
  const [analysis, setAnalysis] = useState<DeckAnalysisResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'synergy' | 'strategy' | 'winconditions' | 'collection' | 'purchases'>('overview');

  useEffect(() => {
    if (!user?.username) {
      setMyDecks([]);
      setDecksLoading(false);
      return;
    }
    setDecksLoading(true);
    userApi.getDecks(user.username)
      .then(setMyDecks)
      .catch(() => setMyDecks([]))
      .finally(() => setDecksLoading(false));
  }, [user?.username]);

  useEffect(() => {
    if (selectedDeckId === '') {
      setLoadedDeck(null);
      return;
    }
    setDeckLoading(true);
    setLoadedDeck(null);
    setAnalysis(null);
    (async () => {
      try {
        const deckWithCards = await deckApi.get(selectedDeckId as number, true);
        const BATCH = 15;
        const main: DeckCard[] = [];
        const sideboard: DeckCard[] = [];
        const mainCards = deckWithCards.cards.filter((c) => !c.is_sideboard);
        const sbCards = deckWithCards.cards.filter((c) => c.is_sideboard);
        for (let i = 0; i < mainCards.length; i += BATCH) {
          const batch = mainCards.slice(i, i + BATCH);
          const cards = await Promise.all(batch.map((c) => ScryfallService.getCardById(c.scryfall_id)));
          for (let j = 0; j < batch.length; j++) {
            const card = cards[j];
            if (card) main.push({ card, quantity: batch[j].quantity });
          }
        }
        for (let i = 0; i < sbCards.length; i += BATCH) {
          const batch = sbCards.slice(i, i + BATCH);
          const cards = await Promise.all(batch.map((c) => ScryfallService.getCardById(c.scryfall_id)));
          for (let j = 0; j < batch.length; j++) {
            const card = cards[j];
            if (card) sideboard.push({ card, quantity: batch[j].quantity });
          }
        }
        setLoadedDeck({
          name: deckWithCards.name,
          cards: main,
          sideboard,
          wishlist: []
        });
      } catch {
        setLoadedDeck(null);
      } finally {
        setDeckLoading(false);
      }
    })();
  }, [selectedDeckId]);

  const handleAnalyze = async () => {
    if (!loadedDeck) return;
    setLoading(true);
    setMessage(null);
    setAnalysis(null);
    try {
      const analysisResult = await DeckAnalysisService.analyzeDeck(loadedDeck, format);
      setAnalysis(analysisResult);
      setMessage({
        type: 'success',
        text: `Analysis complete! ${loadedDeck.cards.length} main deck cards.`
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error analyzing deck: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deck-analysis-panel">
      <h2 className="panel-title">Deck Analysis</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Select a deck you’ve already imported to analyze legality, synergy, strategy, and get improvement recommendations.
      </p>

      {(!analysis || !loadedDeck) && (
        <div className="analysis-input-section">
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Deck:
            </label>
            <select
              value={selectedDeckId === '' ? '' : selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={decksLoading}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              <option value="">Select a deck…</option>
              {myDecks.map((d) => (
                <option key={d.deck_id} value={d.deck_id}>
                  {d.deck_name} ({d.card_count} cards)
                </option>
              ))}
            </select>
            {decksLoading && <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Loading…</span>}
            {!decksLoading && myDecks.length === 0 && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                No saved decks. Import a deck first from the Import Deck tab.
              </p>
            )}
          </div>

          {deckLoading && (
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Loading deck cards…</p>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Format:
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '300px'
              }}
            >
              <option value="standard">Standard</option>
              <option value="modern">Modern</option>
              <option value="pioneer">Pioneer</option>
              <option value="legacy">Legacy</option>
              <option value="vintage">Vintage</option>
              <option value="commander">Commander</option>
            </select>
          </div>

          <button
            className="btn"
            onClick={handleAnalyze}
            disabled={loading || !loadedDeck || deckLoading}
          >
            {loading ? 'Analyzing...' : 'Analyze Deck'}
          </button>

          {message && (
            <div className={message.type === 'error' ? 'error-message' : 'success-message'} style={{ marginTop: '1rem' }}>
              {message.text}
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div className="analysis-results">
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAnalysis(null)}
            >
              ← Select another deck
            </button>
          </div>
          <div className="analysis-tabs" style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid var(--border)',
            paddingBottom: '0.5rem'
          }}>
            <button
              className={activeSection === 'overview' ? 'active' : ''}
              onClick={() => setActiveSection('overview')}
              style={{
                padding: '0.5rem 1rem',
                background: activeSection === 'overview' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Overview
            </button>
            <button
              className={activeSection === 'synergy' ? 'active' : ''}
              onClick={() => setActiveSection('synergy')}
              style={{
                padding: '0.5rem 1rem',
                background: activeSection === 'synergy' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Synergy
            </button>
            <button
              className={activeSection === 'strategy' ? 'active' : ''}
              onClick={() => setActiveSection('strategy')}
              style={{
                padding: '0.5rem 1rem',
                background: activeSection === 'strategy' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Strategy
            </button>
            <button
              className={activeSection === 'winconditions' ? 'active' : ''}
              onClick={() => setActiveSection('winconditions')}
              style={{
                padding: '0.5rem 1rem',
                background: activeSection === 'winconditions' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Win Conditions ({analysis.winConditions.length})
            </button>
            <button
              className={activeSection === 'collection' ? 'active' : ''}
              onClick={() => setActiveSection('collection')}
              style={{
                padding: '0.5rem 1rem',
                background: activeSection === 'collection' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Collection ({analysis.collectionImprovements.length})
            </button>
            <button
              className={activeSection === 'purchases' ? 'active' : ''}
              onClick={() => setActiveSection('purchases')}
              style={{
                padding: '0.5rem 1rem',
                background: activeSection === 'purchases' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Buy ({analysis.purchaseRecommendations.length})
            </button>
          </div>

          {activeSection === 'overview' && (
            <div className="analysis-section">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Legality Check</h3>
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                background: analysis.legality.isValid ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${analysis.legality.isValid ? 'var(--success)' : 'var(--error)'}`,
                color: analysis.legality.isValid ? 'var(--success)' : 'var(--error)',
                fontWeight: 600
              }}>
                {analysis.legality.isValid ? '✓ Deck is legal for ' + analysis.legality.format : '✗ Deck has legality issues'}
              </div>

              {analysis.legality.errors.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>Errors:</h4>
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                    {analysis.legality.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.legality.warnings.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>Warnings:</h4>
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                    {analysis.legality.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Quick Stats</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Archetype</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{analysis.strategy.archetype}</div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Win Conditions</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {analysis.winConditions.length}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {analysis.winConditions.filter(wc => wc.confidence === 'high').length} high confidence
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>High Synergy Cards</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {analysis.synergies.filter(s => s.overallSynergy === 'high').length}
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Collection Improvements</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{analysis.collectionImprovements.length}</div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Purchase Recommendations</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{analysis.purchaseRecommendations.length}</div>
                  </div>
                </div>
              </div>

              {analysis.winConditions.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Primary Win Condition</h3>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    border: `1px solid ${analysis.winConditions[0].confidence === 'high' ? 'var(--success)' : analysis.winConditions[0].confidence === 'medium' ? 'var(--warning)' : 'var(--border)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{analysis.winConditions[0].name}</h4>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        background: analysis.winConditions[0].confidence === 'high' ? 'rgba(74, 222, 128, 0.2)' : 
                                   analysis.winConditions[0].confidence === 'medium' ? 'rgba(251, 191, 36, 0.2)' : 
                                   'rgba(107, 114, 128, 0.2)',
                        color: analysis.winConditions[0].confidence === 'high' ? 'var(--success)' : 
                              analysis.winConditions[0].confidence === 'medium' ? 'var(--warning)' : 
                              'var(--text-secondary)'
                      }}>
                        {analysis.winConditions[0].confidence.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      {analysis.winConditions[0].description}
                    </p>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Quick Gameplan:</strong> {analysis.winConditions[0].gameplan[0]}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'synergy' && (
            <div className="analysis-section">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Synergy Analysis</h3>
              {analysis.synergies.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No significant synergies found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {analysis.synergies.map((synergy, i) => (
                    <div key={i} style={{
                      padding: '1rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      border: `1px solid ${synergy.overallSynergy === 'high' ? 'var(--success)' : synergy.overallSynergy === 'medium' ? 'var(--warning)' : 'var(--border)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{synergy.card.name}</h4>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          background: synergy.overallSynergy === 'high' ? 'rgba(74, 222, 128, 0.2)' : 
                                     synergy.overallSynergy === 'medium' ? 'rgba(251, 191, 36, 0.2)' : 
                                     'rgba(107, 114, 128, 0.2)',
                          color: synergy.overallSynergy === 'high' ? 'var(--success)' : 
                                synergy.overallSynergy === 'medium' ? 'var(--warning)' : 
                                'var(--text-secondary)'
                        }}>
                          {synergy.overallSynergy.toUpperCase()} SYNERGY
                        </span>
                      </div>
                      {synergy.synergies.length > 0 && (
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Synergizes with:</div>
                          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem' }}>
                            {synergy.synergies.slice(0, 5).map((combo, j) => (
                              <li key={j} style={{ marginBottom: '0.25rem' }}>
                                <strong>{combo.cardName}</strong> - {combo.reason} 
                                <span style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.85rem',
                                  color: combo.synergy === 'high' ? 'var(--success)' : 
                                        combo.synergy === 'medium' ? 'var(--warning)' : 
                                        'var(--text-secondary)'
                                }}>
                                  ({combo.synergy})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'strategy' && (
            <div className="analysis-section">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Strategy Analysis</h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Archetype: {analysis.strategy.archetype}</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {analysis.strategy.strategy}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--success)' }}>Strengths</h4>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                  {analysis.strategy.strengths.map((strength, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{strength}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--error)' }}>Weaknesses</h4>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                  {analysis.strategy.weaknesses.map((weakness, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{weakness}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Key Mechanics</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {analysis.strategy.keyMechanics.map((mechanic, i) => (
                    <span key={i} style={{
                      padding: '0.25rem 0.75rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      {mechanic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Mana Curve</h4>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '0.25rem',
                  height: '150px',
                  marginBottom: '0.5rem'
                }}>
                  {analysis.strategy.manaCurve.map((mc, i) => {
                    const maxCount = Math.max(...analysis.strategy.manaCurve.map(m => m.count));
                    const height = (mc.count / maxCount) * 100;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: '100%',
                          height: `${height}%`,
                          background: 'var(--primary)',
                          borderRadius: '4px 4px 0 0',
                          minHeight: '10px'
                        }} />
                        <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {mc.cmc}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {mc.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'winconditions' && (
            <div className="analysis-section">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Win Condition Analysis</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                How your deck wins games and how to work towards victory:
              </p>
              
              {analysis.winConditions.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No clear win conditions detected.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {analysis.winConditions.map((winCondition, i) => (
                    <div key={i} style={{
                      padding: '1.5rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      border: `2px solid ${winCondition.confidence === 'high' ? 'var(--success)' : winCondition.confidence === 'medium' ? 'var(--warning)' : 'var(--border)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            {winCondition.name}
                          </h4>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            {winCondition.description}
                          </p>
                        </div>
                        <span style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: winCondition.confidence === 'high' ? 'rgba(74, 222, 128, 0.2)' : 
                                     winCondition.confidence === 'medium' ? 'rgba(251, 191, 36, 0.2)' : 
                                     'rgba(107, 114, 128, 0.2)',
                          color: winCondition.confidence === 'high' ? 'var(--success)' : 
                                winCondition.confidence === 'medium' ? 'var(--warning)' : 
                                'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          marginLeft: '1rem'
                        }}>
                          {winCondition.confidence.toUpperCase()} CONFIDENCE
                        </span>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <h5 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary)' }}>
                          How to Win:
                        </h5>
                        <ol style={{ listStyle: 'decimal', paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                          {winCondition.gameplan.map((step, j) => (
                            <li key={j} style={{ marginBottom: '0.5rem' }}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      {winCondition.keyCards.length > 0 && (
                        <div>
                          <h5 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Key Cards ({winCondition.keyCards.length}):
                          </h5>
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '0.5rem' 
                          }}>
                            {winCondition.keyCards.slice(0, 10).map((card, j) => (
                              <span key={j} style={{
                                padding: '0.5rem 0.75rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                border: '1px solid var(--border)'
                              }}>
                                {card.name}
                                {card.mana_cost && (
                                  <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    {card.mana_cost}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                          {winCondition.cards.length > 10 && (
                            <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              + {winCondition.cards.length - 10} more cards
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {analysis.winConditions.length > 1 && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(251, 191, 36, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid var(--warning)'
                }}>
                  <strong style={{ color: 'var(--warning)' }}>Note:</strong>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                    Your deck has multiple win conditions. Focus on the highest confidence option, but keep backup plans in mind.
                  </span>
                </div>
              )}
            </div>
          )}

          {activeSection === 'collection' && (
            <div className="analysis-section">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Collection Improvements</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Cards from your collection that could improve this deck:
              </p>
              {analysis.collectionImprovements.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No collection improvements found. Make sure you've imported your collection in the "Import Bulk" tab.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {analysis.collectionImprovements.map((improvement, i) => (
                    <div key={i} style={{
                      padding: '1rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      border: `1px solid ${improvement.priority === 'high' ? 'var(--success)' : improvement.priority === 'medium' ? 'var(--warning)' : 'var(--border)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{improvement.card.name}</h4>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          background: improvement.priority === 'high' ? 'rgba(74, 222, 128, 0.2)' : 
                                     improvement.priority === 'medium' ? 'rgba(251, 191, 36, 0.2)' : 
                                     'rgba(107, 114, 128, 0.2)',
                          color: improvement.priority === 'high' ? 'var(--success)' : 
                                improvement.priority === 'medium' ? 'var(--warning)' : 
                                'var(--text-secondary)'
                        }}>
                          {improvement.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)' }}>{improvement.reason}</p>
                      {improvement.card.mana_cost && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Cost: {improvement.card.mana_cost} • CMC: {improvement.card.cmc}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'purchases' && (
            <div className="analysis-section">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Purchase Recommendations</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Cards to consider purchasing to improve this deck:
              </p>
              {analysis.purchaseRecommendations.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No purchase recommendations at this time.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {analysis.purchaseRecommendations.map((rec, i) => (
                    <div key={i} style={{
                      padding: '1rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      border: `1px solid ${rec.priority === 'high' ? 'var(--success)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--border)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{rec.card.name}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {rec.estimatedPrice && (
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                              ${rec.estimatedPrice}
                            </span>
                          )}
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            background: rec.priority === 'high' ? 'rgba(74, 222, 128, 0.2)' : 
                                       rec.priority === 'medium' ? 'rgba(251, 191, 36, 0.2)' : 
                                       'rgba(107, 114, 128, 0.2)',
                            color: rec.priority === 'high' ? 'var(--success)' : 
                                  rec.priority === 'medium' ? 'var(--warning)' : 
                                  'var(--text-secondary)'
                          }}>
                            {rec.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                      </div>
                      <p style={{ color: 'var(--text-secondary)' }}>{rec.reason}</p>
                      {rec.card.mana_cost && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Cost: {rec.card.mana_cost} • CMC: {rec.card.cmc}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn"
              onClick={() => {
                setAnalysis(null);
                setMessage(null);
              }}
            >
              Analyze Another Deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
