import { useState, useRef, useCallback } from 'react';
import type { Deck, DeckCard, Card } from '../types';
import { deckApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPTED_FILE_TYPES = '.txt,.csv,.dec,.dck,.cod';

function minimalCard(scryfallId: string, name: string): Card {
  return {
    id: scryfallId,
    name,
    cmc: 0,
    type_line: '',
    colors: [],
    color_identity: [],
    rarity: '',
    set_name: '',
    collector_number: '',
  };
}

interface DeckImporterProps {
  onDeckImported?: (deck: Deck) => void;
}

type ResolvedCard = { scryfall_id: string; name: string; quantity: number };
interface PendingImport {
  main: ResolvedCard[];
  sideboard: ResolvedCard[];
  not_found: string[];
}

/** Normalize string: strip BOM, normalize quotes, trim. */
function normalizeDeckText(raw: string): string {
  let s = raw.replace(/^\uFEFF/, '').trim();
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  return s;
}

/** Normalize card name for best exact/fuzzy match: trim, collapse spaces, fix apostrophes. */
function normalizeCardName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

/** Parse one CSV line respecting quoted fields (RFC 4180 style). */
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') {
            field += '"';
            i++;
          } else break;
        } else {
          field += line[i++];
        }
      }
      out.push(field.trim());
      if (line[i] === ',') i++;
      continue;
    }
    let end = line.indexOf(',', i);
    if (end === -1) end = line.length;
    out.push(line.slice(i, end).trim());
    i = end + 1;
  }
  return out;
}

/** Infer column indices from CSV header row (case-insensitive). */
function inferCSVColumns(
  headers: string[]
): { nameIdx: number; qtyIdx: number | null; setIdx: number | null; collectorIdx: number | null } | null {
  const lower = headers.map((h) => h.replace(/^\uFEFF/, '').toLowerCase().trim().replace(/\s+/g, ' '));
  let nameIdx = -1;
  let qtyIdx: number | null = null;
  let setIdx: number | null = null;
  let collectorIdx: number | null = null;

  // Fallback: prefer a column that is "card name" (lenient: trim, collapse spaces)
  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    if (h === 'card name' || h.startsWith('card name ') || h.startsWith('card name,')) {
      nameIdx = i;
      break;
    }
  }

  const nameKeys = ['card name', 'card', 'title', 'card name (en)', 'card_title', 'name'];
  const skipForName = ['set name', 'set code', 'edition', 'expansion', 'code'];
  const qtyKeys = ['qty', 'quantity', 'count', 'amount', '#', 'q', 'copies'];
  const setKeys = ['set', 'set code', 'set code (en)', 'edition', 'code', 'expansion'];
  const collectorKeys = ['collector number', 'collector_number', 'number', 'collector #', 'cn', 'collector no'];
  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    const isSetRelated = skipForName.some((k) => h === k || h.includes(k));
    if (nameIdx === -1 && !isSetRelated && nameKeys.some((k) => h.includes(k) || h === k)) nameIdx = i;
    if (qtyIdx === null && qtyKeys.some((k) => h === k || h.startsWith(k + ' ') || h.endsWith(' ' + k))) qtyIdx = i;
    if (setIdx === null && setKeys.some((k) => h === k || h.startsWith(k + ' ') || h.endsWith(' ' + k))) setIdx = i;
    if (collectorIdx === null && collectorKeys.some((k) => h === k || h.startsWith(k + ' ') || h.endsWith(' ' + k))) collectorIdx = i;
  }
  if (nameIdx === -1) {
    if (lower.length >= 2 && /^\d+$/.test(headers[0]?.trim() ?? '')) {
      qtyIdx = 0;
      nameIdx = 1;
      if (lower.length >= 3 && (lower[2]?.length ?? 0) <= 5) setIdx = 2;
    } else if (lower.length >= 1) {
      nameIdx = 0;
      if (lower.length >= 2 && /^\d+$/.test(headers[1]?.trim() ?? '')) qtyIdx = 1;
      if (lower.length >= 3 && (lower[2]?.length ?? 0) <= 5) setIdx = 2;
    } else return null;
  }
  return { nameIdx, qtyIdx, setIdx, collectorIdx };
}

/** Detect if content looks like CSV (comma-separated with multiple columns). */
function looksLikeCSV(text: string): boolean {
  const firstLine = text.split('\n').find((l) => l.trim().length > 0);
  if (!firstLine || !firstLine.includes(',')) return false;
  const fields = parseCSVLine(firstLine);
  return fields.length >= 2;
}

/** Parse CSV into main deck list. Uses header row to infer columns when possible. */
function parseCSVToCards(
  text: string
): { main: Array<{ quantity: number; name: string; set?: string }>; sideboard: Array<{ quantity: number; name: string; set?: string }> } {
  const normalized = normalizeDeckText(text);
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  const main: Array<{ quantity: number; name: string; set?: string }> = [];
  const sideboard: Array<{ quantity: number; name: string; set?: string }> = [];

  if (lines.length === 0) return { main, sideboard };

  const firstRow = parseCSVLine(lines[0]);
  const colMap = inferCSVColumns(firstRow);
  let startRow = 0;

  if (colMap && firstRow.length >= 2) {
    const firstCell = (firstRow[colMap.nameIdx] ?? '').trim().toLowerCase();
    const looksLikeHeader =
      firstCell && !/^\d+$/.test(firstCell) && nameLooksLikeHeader(firstCell);
    if (looksLikeHeader) startRow = 1;
  }

  for (let r = startRow; r < lines.length; r++) {
    const row = parseCSVLine(lines[r]);
    if (row.length === 0) continue;

    let name = '';
    let quantity = 1;
    let set: string | undefined;

    if (colMap) {
      name = (row[colMap.nameIdx] ?? '').trim();
      if (colMap.qtyIdx !== null) {
        const q = parseInt(row[colMap.qtyIdx] ?? '', 10);
        if (!Number.isNaN(q) && q > 0) quantity = q;
      }
      if (colMap.setIdx !== null) {
        const setVal = (row[colMap.setIdx] ?? '').trim();
        if (setVal.length >= 2 && setVal.length <= 5) set = setVal.toLowerCase();
      }
    } else {
      if (row.length >= 1) name = row[0].trim();
      if (row.length >= 2) {
        const q = parseInt(row[1], 10);
        if (!Number.isNaN(q) && q > 0) {
          quantity = q;
          if (row.length >= 3) set = row[2].trim().toLowerCase().slice(0, 5) || undefined;
        }
      }
    }

    name = normalizeCardName(name);
    if (!name) continue;

    main.push({ quantity, name, set });
  }

  return { main, sideboard };
}

function nameLooksLikeHeader(cell: string): boolean {
  const headerLike = ['name', 'card', 'title', 'qty', 'quantity', 'set', 'edition', 'count', '#'];
  return headerLike.some((h) => cell === h || cell.startsWith(h + ' ') || cell.includes('('));
}

/** Parse one line into quantity + name + optional set. Returns null if not a card line. */
function parseLine(
  line: string
): { quantity: number; name: string; set?: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Comment
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) return null;

  // Sideboard markers (caller handles section switch); "Commander"/"Companion" are just comments
  const lower = trimmed.toLowerCase();
  if (lower === 'sideboard' || lower === 'sb:' || lower.startsWith('sb ')) return null;
  if (lower === 'commander' || lower === 'companion') return null; // skip label line, don't change section

  // MTGO: "1 [SET:xxx] Card Name" or "1 [xxx] Card Name"
  const mtgo = trimmed.match(/^(\d+)\s*\[(?:SET:)?([A-Za-z0-9]{2,5})\]\s*(.+)$/);
  if (mtgo) {
    const q = parseInt(mtgo[1], 10);
    const name = mtgo[3].trim();
    if (name && !Number.isNaN(q) && q > 0) return { quantity: q, name, set: mtgo[2].toLowerCase() };
  }

  // "N Name (SET)" or "N Name (SET) 290" or "N Name (SET) JMP-74" (Arena / common; collector number can be digits or e.g. JMP-74)
  const withSet = trimmed.match(/^(\d+)\s*x?\s*(.+?)\s*\(([A-Za-z0-9]{2,5})\)(?:\s+[^\s]+)?\s*$/);
  if (withSet) {
    const q = parseInt(withSet[1], 10);
    const name = withSet[2].trim();
    if (name && !Number.isNaN(q) && q > 0) return { quantity: q, name, set: withSet[3].toLowerCase() };
  }

  // "Nx Name" or "N Name"
  const withQty = trimmed.match(/^(\d+)\s*x?\s*(.+)$/);
  if (withQty) {
    const q = parseInt(withQty[1], 10);
    const name = withQty[2].trim();
    if (name && !Number.isNaN(q) && q > 0) return { quantity: q, name };
  }

  // "Name" only (assume 1)
  if (trimmed.length >= 2 && !/^\d+\s*$/.test(trimmed)) {
    return { quantity: 1, name: trimmed };
  }

  return null;
}

/** Parse deck list into main + sideboard. Handles Sideboard/SB/Commander/Companion section headers. */
function parseDeckListToCards(
  text: string
): { main: Array<{ quantity: number; name: string; set?: string }>; sideboard: Array<{ quantity: number; name: string; set?: string }> } {
  const normalized = normalizeDeckText(text);
  const lines = normalized.split('\n');
  const main: Array<{ quantity: number; name: string; set?: string }> = [];
  const sideboard: Array<{ quantity: number; name: string; set?: string }> = [];
  let isSideboard = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (lower === 'sideboard' || lower === 'sb:' || lower.startsWith('sb ')) {
      isSideboard = true;
      continue;
    }
    if (lower === 'commander' || lower === 'companion') continue; // skip label only

    const parsed = parseLine(line);
    if (parsed) {
      parsed.name = normalizeCardName(parsed.name);
      (isSideboard ? sideboard : main).push(parsed);
    }
  }

  return { main, sideboard };
}

/** Parse any input: CSV or line-based deck list. Returns normalized main + sideboard. */
function parseDeckInput(
  text: string
): { main: Array<{ quantity: number; name: string; set?: string }>; sideboard: Array<{ quantity: number; name: string; set?: string }> } {
  const normalized = normalizeDeckText(text);
  if (looksLikeCSV(normalized)) return parseCSVToCards(normalized);
  return parseDeckListToCards(normalized);
}

export function DeckImporter({ onDeckImported }: DeckImporterProps) {
  const { user } = useAuth();
  const [deckText, setDeckText] = useState('');
  const [deckName, setDeckName] = useState('Imported Deck');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');
  const [autoResolveOnImport, setAutoResolveOnImport] = useState(true);
  const [addCardName, setAddCardName] = useState('');
  const [addCardToList, setAddCardToList] = useState<'main' | 'sideboard'>('main');
  const [addCardLoading, setAddCardLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setFileError(null);
    setFileName(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB).`);
      return;
    }

    const allowedExt = /\.(txt|csv|dec|dck|cod)$/i;
    const allowedMime = /^(text\/plain|text\/csv|application\/octet-stream)$/;
    if (!allowedExt.test(file.name) && !allowedMime.test(file.type)) {
      setFileError('Unsupported file type. Use .txt, .csv, .dec, .dck, or .cod');
      return;
    }

    setFileLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      setFileLoading(false);
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          setFileError('Could not read file as text.');
          return;
        }
        const normalized = normalizeDeckText(text);
        setDeckText(normalized);
        setFileName(file.name);
        setMessage(null);
      } catch {
        setFileError('Failed to process file contents.');
      }
    };

    reader.onerror = () => {
      setFileLoading(false);
      setFileError('Failed to read file.');
    };

    reader.onabort = () => {
      setFileLoading(false);
      setFileError('File read was cancelled.');
    };

    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = '';
  };

  const clearFile = useCallback(() => {
    setDeckText('');
    setFileName(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleImport = async () => {
    if (!deckText.trim()) {
      setMessage({ type: 'error', text: 'Please paste deck list or upload a file' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setImportProgress(5);
    setImportStage('Parsing deck list...');

    try {
      const { main, sideboard } = parseDeckInput(deckText);
      setImportProgress(25);
      setImportStage('Preparing cards for import...');
      if (main.length === 0 && sideboard.length === 0) {
        setMessage({ type: 'error', text: 'No valid lines found. Use format: "2 Lightning Bolt" or "1 Name (SET) 123".' });
        setLoading(false);
        return;
      }
      if (!user?.username) {
        setMessage({ type: 'error', text: 'Please log in to import and manage decks.' });
        setLoading(false);
        return;
      }

      const name = (deckName || 'Imported Deck').trim();
      setImportProgress(60);
      setImportStage('Saving raw cards to database...');
      const created = await deckApi.importRaw({
        name,
        owner_username: user.username,
        format: 'casual',
        cards: [
          ...main.map((c) => ({ name: c.name, quantity: c.quantity, is_sideboard: false })),
          ...sideboard.map((c) => ({ name: c.name, quantity: c.quantity, is_sideboard: true }))
        ]
      });

      const total = main.reduce((s, c) => s + c.quantity, 0) + sideboard.reduce((s, c) => s + c.quantity, 0);
      let autoResolved = 0;
      let stillUnmatched = 0;
      if (autoResolveOnImport && user?.username) {
        setImportProgress(72);
        setImportStage('Auto-matching cards with Scryfall...');
        const unmatched = await userApi.getUnmatchedCards(user.username);
        const forDeck = unmatched.filter((u) => u.deck_id === created.id);
        stillUnmatched = forDeck.length;
        for (let i = 0; i < forDeck.length; i++) {
          const u = forDeck[i];
          const lookup = await deckApi.resolveList([{ quantity: 1, name: u.raw_name }]);
          const first = lookup.resolved[0];
          if (first) {
            await deckApi.resolveImportedCard(u.id, first.scryfall_id);
            autoResolved += 1;
            stillUnmatched -= 1;
          }
          const p = 72 + Math.round(((i + 1) / Math.max(1, forDeck.length)) * 23);
          setImportProgress(p);
        }
      }
      setImportProgress(100);
      setImportStage('Import complete.');
      setMessage({
        type: 'success',
        text: autoResolveOnImport
          ? `Imported ${total} raw card entr${total === 1 ? 'y' : 'ies'}. Auto-resolved ${autoResolved}. ${stillUnmatched} still unmatched in Collection.`
          : `Imported ${total} raw card entr${total === 1 ? 'y' : 'ies'}. Go to Collection to resolve unmatched cards to Scryfall.`
      });
      setPendingImport(null);
      setDeckText('');
      setFileName(null);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isNetwork = /cannot reach api|vite_api_url|fetch|network|failed to fetch|load failed/i.test(msg);
      let text = `Error importing deck: ${msg}`;
      if (isNetwork) {
        text += ' Make sure the site was built with the correct API URL (VITE_API_URL) and the backend is reachable.';
      } else {
        text += ' If Scryfall is blocked, the server will resolve names for you.';
      }
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setImportProgress(0);
        setImportStage('');
      }, 800);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport || (pendingImport.main.length === 0 && pendingImport.sideboard.length === 0)) {
      setPendingImport(null);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const deckCards: DeckCard[] = pendingImport.main.map((r) => ({
        card: minimalCard(r.scryfall_id, r.name),
        quantity: r.quantity
      }));
      const sideboardCards: DeckCard[] = pendingImport.sideboard.map((r) => ({
        card: minimalCard(r.scryfall_id, r.name),
        quantity: r.quantity
      }));
      const name = (deckName || 'Imported Deck').trim();

      if (user?.username) {
        const created = await deckApi.create({
          name,
          owner_username: user.username,
          format: 'casual'
        });
        const deckId = created.id;
        for (const r of pendingImport.main) {
          await deckApi.addCard(deckId, r.scryfall_id, { quantity: r.quantity, is_sideboard: false });
        }
        for (const r of pendingImport.sideboard) {
          await deckApi.addCard(deckId, r.scryfall_id, { quantity: r.quantity, is_sideboard: true });
        }
      }

      const importedDeck: Deck = {
        name,
        cards: deckCards,
        sideboard: sideboardCards,
        wishlist: []
      };
      const total = pendingImport.main.length + pendingImport.sideboard.length;
      let successText = `Imported ${total} card${total === 1 ? '' : 's'}.`;
      if (user?.username) successText += ' Saved to My Decks.';
      if (pendingImport.not_found.length > 0) {
        successText += ` (${pendingImport.not_found.length} not found)`;
      }
      setMessage({ type: 'success', text: successText });
      onDeckImported?.(importedDeck);
      setPendingImport(null);
      setDeckText('');
      setFileName(null);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error saving deck: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setPendingImport(null);
    setMessage(null);
  };

  const removeFromPending = (list: 'main' | 'sideboard', index: number) => {
    if (!pendingImport) return;
    const next = { ...pendingImport, [list]: [...pendingImport[list]] };
    next[list].splice(index, 1);
    setPendingImport(next);
  };

  const updatePendingQuantity = (list: 'main' | 'sideboard', index: number, delta: number) => {
    if (!pendingImport) return;
    const next = { ...pendingImport, [list]: [...pendingImport[list]] };
    const r = next[list][index];
    const newQty = Math.max(0, r.quantity + delta);
    if (newQty === 0) {
      next[list].splice(index, 1);
    } else {
      next[list][index] = { ...r, quantity: newQty };
    }
    setPendingImport(next);
  };

  const handleAddCard = async () => {
    const name = addCardName.trim();
    if (!name || !pendingImport || addCardLoading) return;
    setAddCardLoading(true);
    try {
      const result = await deckApi.resolveList([{ quantity: 1, name }]);
      if (result.resolved.length > 0) {
        const card = result.resolved[0];
        const next = { ...pendingImport, [addCardToList]: [...pendingImport[addCardToList], { scryfall_id: card.scryfall_id, name: card.name, quantity: 1 }] };
        setPendingImport(next);
        setAddCardName('');
      } else {
        setMessage({ type: 'error', text: `Could not find: ${name}` });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to look up card.' });
    } finally {
      setAddCardLoading(false);
    }
  };

  return (
    <div className="import-panel">
      <h2 className="panel-title">Import Deck</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Import a deck from a text file or paste a deck list. Card names are resolved on the server, so this works even when Scryfall is blocked on your network.
        {user?.username ? ' Decks are saved to My Decks so you can validate or analyze them later.' : ' Log in to save decks to My Decks.'}
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Deck name (saved to My Decks):
        </label>
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="Imported Deck"
          className="search-input"
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          id="auto-resolve-toggle"
          type="checkbox"
          checked={autoResolveOnImport}
          onChange={(e) => setAutoResolveOnImport(e.target.checked)}
        />
        <label htmlFor="auto-resolve-toggle" style={{ color: 'var(--text-secondary)' }}>
          Auto-match cards with Scryfall during import (slower, but reduces manual resolving)
        </label>
      </div>

      <div className="file-input-wrapper">
        <label className="file-input-label">
          📁 Upload Deck File
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            className="file-input"
            onChange={handleFileInputChange}
            aria-label="Upload deck file"
          />
        </label>
        {fileLoading && <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Reading file…</p>}
        {fileError && <p className="error-message" style={{ marginTop: '0.5rem' }}>{fileError}</p>}
        {fileName && !fileLoading && (
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Loaded: <strong>{fileName}</strong>
            {' '}
            <button type="button" className="btn" style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem' }} onClick={clearFile}>Clear</button>
          </p>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Or paste deck list:
        </label>
        <textarea
          className="import-textarea"
          value={deckText}
          onChange={(e) => setDeckText(e.target.value)}
          placeholder="2 Lightning Bolt&#10;4 Counterspell&#10;20 Island&#10;1 Chromatic Lantern (PLG25) 1&#10;14 Forest (PLST) JMP-74"
        />
        {deckText.trim() && (() => {
          const { main, sideboard } = parseDeckInput(deckText);
          const mainCount = main.reduce((s, c) => s + c.quantity, 0);
          const sbCount = sideboard.reduce((s, c) => s + c.quantity, 0);
          return (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Detected: {mainCount} main, {sbCount} sideboard card{(mainCount + sbCount) === 1 ? '' : 's'}.
            </p>
          );
        })()}
      </div>

      <button
        className="btn"
        onClick={handleImport}
        disabled={loading || !deckText.trim() || pendingImport !== null}
      >
        {loading ? 'Importing...' : 'Import Deck'}
      </button>

      {(loading || importProgress > 0) && (
        <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            <span>{importStage || 'Importing...'}</span>
            <span>{Math.round(importProgress)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.12)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, importProgress))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff4d7a 0%, #ff7ca0 100%)',
                transition: 'width 220ms ease'
              }}
            />
          </div>
        </div>
      )}

      {pendingImport && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color, #444)' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Confirm cards to import</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Review the full list below. Add or remove cards and adjust quantities, then confirm to save.
          </p>

          <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Card name to add"
              value={addCardName}
              onChange={(e) => setAddCardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
              style={{ flex: '1', minWidth: '160px', maxWidth: '280px' }}
            />
            <select
              value={addCardToList}
              onChange={(e) => setAddCardToList(e.target.value as 'main' | 'sideboard')}
              className="search-input"
              style={{ width: 'auto' }}
            >
              <option value="main">Add to main</option>
              <option value="sideboard">Add to sideboard</option>
            </select>
            <button type="button" className="btn" onClick={handleAddCard} disabled={addCardLoading || !addCardName.trim()}>
              {addCardLoading ? 'Looking up…' : 'Add card'}
            </button>
          </div>

          {pendingImport.main.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Main deck ({pendingImport.main.reduce((s, c) => s + c.quantity, 0)} cards)</h4>
              <ul style={{ maxHeight: '400px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
                {pendingImport.main.map((r, i) => (
                  <li key={`${r.scryfall_id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <button type="button" aria-label="Decrease" style={{ width: '28px', padding: '0.2rem', fontSize: '1rem', lineHeight: 1 }} onClick={() => updatePendingQuantity('main', i, -1)}>−</button>
                    <span style={{ minWidth: '2rem', textAlign: 'center' }}>{r.quantity}</span>
                    <button type="button" aria-label="Increase" style={{ width: '28px', padding: '0.2rem', fontSize: '1rem', lineHeight: 1 }} onClick={() => updatePendingQuantity('main', i, 1)}>+</button>
                    <span style={{ flex: 1 }}>{r.name}</span>
                    <button type="button" className="btn" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => removeFromPending('main', i)}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pendingImport.sideboard.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Sideboard ({pendingImport.sideboard.reduce((s, c) => s + c.quantity, 0)} cards)</h4>
              <ul style={{ maxHeight: '300px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
                {pendingImport.sideboard.map((r, i) => (
                  <li key={`sb-${r.scryfall_id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <button type="button" aria-label="Decrease" style={{ width: '28px', padding: '0.2rem', fontSize: '1rem', lineHeight: 1 }} onClick={() => updatePendingQuantity('sideboard', i, -1)}>−</button>
                    <span style={{ minWidth: '2rem', textAlign: 'center' }}>{r.quantity}</span>
                    <button type="button" aria-label="Increase" style={{ width: '28px', padding: '0.2rem', fontSize: '1rem', lineHeight: 1 }} onClick={() => updatePendingQuantity('sideboard', i, 1)}>+</button>
                    <span style={{ flex: 1 }}>{r.name}</span>
                    <button type="button" className="btn" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => removeFromPending('sideboard', i)}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pendingImport.main.length === 0 && pendingImport.sideboard.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>No cards in list. Add cards above or cancel.</p>
          )}
          {pendingImport.not_found.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Not found ({pendingImport.not_found.length})</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{pendingImport.not_found.join(', ')}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={handleConfirmImport} disabled={loading || (pendingImport.main.length === 0 && pendingImport.sideboard.length === 0)}>
              {loading ? 'Saving...' : 'Confirm & import'}
            </button>
            <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)' }} onClick={handleCancelConfirm} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Supported formats</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Files: .txt, .csv, .dec (MTGO), .dck, .cod. Card names are normalized and resolved with exact match first, then fuzzy search for the best match. Use &quot;Sideboard&quot; or &quot;SB:&quot; for line-based lists.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          <strong>CSV:</strong> Any CSV with a header or data rows. Columns are auto-detected (e.g. Name, Card Name, Qty, Quantity, Set, Set Code, Edition). Quoted fields and commas inside quotes are supported.
        </p>
        <pre style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', overflow: 'auto' }}>
{`Quantity + name:
2 Lightning Bolt
4 Counterspell
20 Island

With set code (Arena-style):
1 Chromatic Lantern (PLG25) 1
14 Forest (PLST) JMP-74

MTGO (.dec):
1 [DMU] Tatyova, Steward of Tides
2 [SNC] Raffine, Scheming Seer

Name only (1 copy):
Lightning Bolt`}
        </pre>
      </div>
    </div>
  );
}
