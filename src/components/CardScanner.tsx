import { useState, useRef, useCallback, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { ScryfallService } from '../services/scryfall';
import { useAuth } from '../contexts/AuthContext';
import { collectionApi } from '../services/api';
import type { Card } from '../types';

interface CardScannerProps {
  onCardAdded?: (card: Card) => void;
  onClose?: () => void;
}

type ScanState = 'idle' | 'camera' | 'processing' | 'results' | 'adding';

export function CardScanner({ onCardAdded, onClose }: CardScannerProps) {
  const { user } = useAuth();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanState('camera');
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please allow camera permissions.');
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture image from video
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Crop to top portion where card name is (roughly top 15% of image)
    const cropHeight = Math.floor(canvas.height * 0.20);
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = canvas.width;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    if (croppedCtx) {
      // Increase contrast for better OCR
      croppedCtx.filter = 'contrast(1.5) brightness(1.1)';
      croppedCtx.drawImage(canvas, 0, 0, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight);
    }
    
    // Stop camera
    stopCamera();
    setScanState('processing');
    
    // Perform OCR
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProcessingProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      const { data: { text } } = await worker.recognize(croppedCanvas);
      await worker.terminate();
      
      // Clean up the text - extract potential card name
      const cleanedText = cleanCardName(text);
      setRecognizedText(cleanedText);
      
      if (cleanedText.length > 2) {
        // Search Scryfall
        const results = await ScryfallService.searchCard(cleanedText);
        setSearchResults(results.slice(0, 6)); // Top 6 results
        setScanState('results');
      } else {
        setError('Could not read card name. Try again with better lighting.');
        setScanState('idle');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError('Failed to process image. Please try again.');
      setScanState('idle');
    }
  };

  // Clean up OCR text to extract card name
  const cleanCardName = (text: string): string => {
    // Take first line (card name is at top)
    const firstLine = text.split('\n')[0] || '';
    
    // Remove common OCR artifacts and clean up
    return firstLine
      .replace(/[^a-zA-Z\s,'-]/g, '') // Keep only letters and common punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  // Add card to collection
  const addToCollection = async (card: Card) => {
    if (!user) return;
    
    setScanState('adding');
    try {
      await collectionApi.addCard(user.username, card.id, 1);
      onCardAdded?.(card);
      
      // Reset for next scan
      setSearchResults([]);
      setRecognizedText('');
      setScanState('idle');
    } catch (err) {
      console.error('Failed to add card:', err);
      setError('Failed to add card to collection.');
      setScanState('results');
    }
  };

  // Handle file upload as alternative to camera
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setScanState('processing');
    
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProcessingProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      const cleanedText = cleanCardName(text);
      setRecognizedText(cleanedText);
      
      if (cleanedText.length > 2) {
        const results = await ScryfallService.searchCard(cleanedText);
        setSearchResults(results.slice(0, 6));
        setScanState('results');
      } else {
        setError('Could not read card name. Try a clearer image.');
        setScanState('idle');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError('Failed to process image.');
      setScanState('idle');
    }
  };

  // Manual search fallback
  const [manualSearch, setManualSearch] = useState('');
  
  const handleManualSearch = async () => {
    if (manualSearch.length < 2) return;
    
    setScanState('processing');
    setProcessingProgress(50);
    
    try {
      const results = await ScryfallService.searchCard(manualSearch);
      setSearchResults(results.slice(0, 6));
      setRecognizedText(manualSearch);
      setScanState('results');
    } catch (err) {
      setError('Search failed. Please try again.');
      setScanState('idle');
    }
  };

  // Close and cleanup
  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  return (
    <div className="card-scanner">
      <div className="scanner-header">
        <h2>Scan Card</h2>
        <button className="close-button" onClick={handleClose}>×</button>
      </div>
      
      {error && (
        <div className="scanner-error">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {scanState === 'idle' && (
        <div className="scanner-options">
          <p className="scanner-instructions">
            Point your camera at a Magic card to scan it into your collection.
          </p>
          
          <button className="scanner-button primary" onClick={startCamera}>
            📷 Open Camera
          </button>
          
          <div className="scanner-divider">
            <span>or</span>
          </div>
          
          <label className="scanner-button secondary">
            📁 Upload Image
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          
          <div className="scanner-divider">
            <span>or search manually</span>
          </div>
          
          <div className="manual-search">
            <input
              type="text"
              placeholder="Type card name..."
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <button onClick={handleManualSearch} disabled={manualSearch.length < 2}>
              Search
            </button>
          </div>
        </div>
      )}
      
      {scanState === 'camera' && (
        <div className="scanner-camera">
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          <div className="camera-overlay">
            <div className="scan-guide">
              <p>Position card name in this area</p>
            </div>
          </div>
          
          <div className="camera-controls">
            <button className="cancel-button" onClick={() => { stopCamera(); setScanState('idle'); }}>
              Cancel
            </button>
            <button className="capture-button" onClick={captureImage}>
              📸 Capture
            </button>
          </div>
        </div>
      )}
      
      {scanState === 'processing' && (
        <div className="scanner-processing">
          <div className="processing-spinner"></div>
          <p>Reading card...</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${processingProgress}%` }} />
          </div>
          <span className="progress-text">{processingProgress}%</span>
        </div>
      )}
      
      {scanState === 'results' && (
        <div className="scanner-results">
          {recognizedText && (
            <p className="recognized-text">
              Searched for: "<strong>{recognizedText}</strong>"
            </p>
          )}
          
          {searchResults.length > 0 ? (
            <>
              <p className="results-label">Select the correct card:</p>
              <div className="results-grid">
                {searchResults.map((card) => (
                  <div 
                    key={card.id} 
                    className="result-card"
                    onClick={() => addToCollection(card)}
                  >
                    {card.image_uris?.small ? (
                      <img src={card.image_uris.small} alt={card.name} />
                    ) : (
                      <div className="card-placeholder">{card.name}</div>
                    )}
                    <span className="card-name">{card.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="no-results">No cards found. Try scanning again or search manually.</p>
          )}
          
          <div className="results-actions">
            <button onClick={() => { setSearchResults([]); setScanState('idle'); }}>
              ← Scan Another
            </button>
          </div>
        </div>
      )}
      
      {scanState === 'adding' && (
        <div className="scanner-processing">
          <div className="processing-spinner"></div>
          <p>Adding to collection...</p>
        </div>
      )}
    </div>
  );
}
