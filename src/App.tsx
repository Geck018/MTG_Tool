import { useState, useEffect } from 'react';
import { HomePage, type GameType } from './components/HomePage';
import { MTGApp } from './components/MTGApp';
import { WarhammerApp } from './components/WarhammerApp';
import { RulesChat } from './components/RulesChat';
import { LoginSignup, UserMenu } from './components/LoginSignup';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginSignup />;
  }

  return (
    <div className="tabletop-tools">
      {/* Global user menu */}
      <div className="global-header">
        <UserMenu />
      </div>
      
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
