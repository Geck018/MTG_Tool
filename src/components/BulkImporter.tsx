import { useState } from 'react';
import type { BulkCard } from '../types';
import { CSVService } from '../utils/csv';

interface BulkImporterProps {
  onCardsImported: (cards: BulkCard[]) => void;
}

export function BulkImporter({ onCardsImported }: BulkImporterProps) {
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      setMessage({ type: 'error', text: 'Please paste CSV data or upload a file' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const bulkCards = CSVService.parseBulkCSV(csvText);
      
      if (bulkCards.length === 0) {
        setMessage({ type: 'error', text: 'No cards found in CSV. Please check the format.' });
        setLoading(false);
        return;
      }

      // Store all bulk cards in localStorage
      // We store the raw bulk data, not the full card objects (saves space)
      try {
        localStorage.setItem('mtg_bulk_collection', JSON.stringify(bulkCards));
        setMessage({
          type: 'success',
          text: `Imported ${bulkCards.length} cards to your collection! You can now see which cards you have vs. need.`
        });
      } catch (error) {
        setMessage({
          type: 'error',
          text: `Error saving collection: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

      onCardsImported(bulkCards);
      setCsvText('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error importing cards: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-panel">
      <h2 className="panel-title">Import Bulk Cards</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Import your collection from a CSV file. Expected format: Name, Quantity, Set (optional), Collector Number (optional)
      </p>

      <div className="file-input-wrapper">
        <label className="file-input-label">
          📁 Upload CSV File
          <input
            type="file"
            accept=".csv"
            className="file-input"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Or paste CSV data:
        </label>
        <textarea
          className="import-textarea"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="Name,Quantity,Set,Collector Number&#10;Lightning Bolt,4,LEB,161&#10;Island,20,LEB,234"
        />
      </div>

      <button
        className="btn"
        onClick={handleImport}
        disabled={loading || !csvText.trim()}
      >
        {loading ? 'Importing...' : 'Import Cards'}
      </button>

      {message && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>CSV Format Example:</h3>
        <pre style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', overflow: 'auto' }}>
{`Name,Quantity,Set,Collector Number
Lightning Bolt,4,LEB,161
Island,20,LEB,234
Jace, the Mind Sculptor,1,WWK,75`}
        </pre>
      </div>
    </div>
  );
}
