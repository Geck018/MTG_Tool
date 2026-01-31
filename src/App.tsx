import { useState, useEffect } from 'react';
import { HomePage, type GameType } from './components/HomePage';
import { MTGApp } from './components/MTGApp';
import { WarhammerApp } from './components/WarhammerApp';
import { RulesChat } from './components/RulesChat';
import './App.css';

function App() {
  const [currentGame, setCurrentGame] = useState<GameType>('home');

  // Handle URL routing
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/mtg')) {
      setCurrentGame('mtg');
    } else if (hash.startsWith('#/warhammer')) {
      setCurrentGame('warhammer');
    } else if (hash.startsWith('#/rules')) {
      setCurrentGame('rules');
    } else {
      setCurrentGame('home');
    }

    // Listen for browser back/forward
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/mtg')) {
        setCurrentGame('mtg');
      } else if (hash.startsWith('#/warhammer')) {
        setCurrentGame('warhammer');
      } else if (hash.startsWith('#/rules')) {
        setCurrentGame('rules');
      } else {
        setCurrentGame('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectGame = (game: GameType) => {
    setCurrentGame(game);
    if (game === 'home') {
      window.history.pushState({}, '', '/');
    } else {
      window.history.pushState({}, '', `#/${game}`);
    }
  };

  const handleBackToHome = () => {
    setCurrentGame('home');
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="tabletop-tools">
      {currentGame === 'home' && (
        <HomePage onSelectGame={handleSelectGame} />
      )}
      {currentGame === 'mtg' && (
        <MTGApp onBack={handleBackToHome} />
      )}
      {currentGame === 'warhammer' && (
        <WarhammerApp onBack={handleBackToHome} />
      )}
      {currentGame === 'rules' && (
        <div className="rules-page">
          <RulesChat gameSystem="mtg" onBack={handleBackToHome} />
        </div>
      )}
    </div>
  );
}

export default App;
