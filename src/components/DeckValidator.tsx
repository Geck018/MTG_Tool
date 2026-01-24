import { useState } from 'react';
import type { Deck } from '../types';
import { DeckValidator as Validator } from '../utils/deckValidation';

interface DeckValidatorProps {
  deck: Deck;
}

export function DeckValidator({ deck }: DeckValidatorProps) {
  const [format, setFormat] = useState('standard');
  const validation = Validator.validate(deck, format);

  return (
    <div className="validation-result">
      <h2 className="panel-title">Deck Validation</h2>

      <div style={{ marginBottom: '1.5rem' }}>
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
            cursor: 'pointer'
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

      <div style={{
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        background: validation.isValid ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${validation.isValid ? 'var(--success)' : 'var(--error)'}`,
        color: validation.isValid ? 'var(--success)' : 'var(--error)',
        fontWeight: 600
      }}>
        {validation.isValid ? '✓ Deck is valid!' : '✗ Deck has errors'}
      </div>

      {validation.errors.length > 0 && (
        <div className="validation-section">
          <h3 className="validation-section-title" style={{ color: 'var(--error)' }}>
            Errors ({validation.errors.length})
          </h3>
          <ul className="validation-list">
            {validation.errors.map((error, index) => (
              <li key={index} className="validation-item error">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="validation-section">
          <h3 className="validation-section-title" style={{ color: 'var(--warning)' }}>
            Warnings ({validation.warnings.length})
          </h3>
          <ul className="validation-list">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="validation-item warning">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.suggestions.length > 0 && (
        <div className="validation-section">
          <h3 className="validation-section-title" style={{ color: 'var(--success)' }}>
            Suggestions ({validation.suggestions.length})
          </h3>
          <ul className="validation-list">
            {validation.suggestions.map((suggestion, index) => (
              <li key={index} className="validation-item suggestion">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.errors.length === 0 && validation.warnings.length === 0 && validation.suggestions.length === 0 && (
        <div className="empty-state">
          <div>No issues found! Your deck looks good.</div>
        </div>
      )}
    </div>
  );
}
