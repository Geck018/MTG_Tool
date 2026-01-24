import type { Deck } from '../types';
import { CSVService } from '../utils/csv';

interface ExportButtonProps {
  deck: Deck;
}

export function ExportButton({ deck }: ExportButtonProps) {
  const handleExport = () => {
    const allCards = [...deck.cards, ...deck.sideboard];
    
    if (allCards.length === 0) {
      alert('Deck is empty. Nothing to export.');
      return;
    }

    const csv = CSVService.exportToCSV(allCards);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name || 'deck'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const mainDeckCount = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);
  const sideboardCount = deck.sideboard.reduce((sum, dc) => sum + dc.quantity, 0);
  const totalCount = mainDeckCount + sideboardCount;

  return (
    <button
      className="btn"
      onClick={handleExport}
      disabled={totalCount === 0}
      title="Export deck to CSV (compatible with MythicTools)"
    >
      📥 Export CSV ({totalCount} cards)
    </button>
  );
}
