import { useState } from 'react';

export type GameType = 'home' | 'mtg' | 'warhammer';

interface GameOption {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: 'active' | 'coming-soon' | 'placeholder';
}

const GAMES: GameOption[] = [
  {
    id: 'mtg',
    name: 'Magic: The Gathering',
    description: 'Deck builder, collection manager, and deck analysis tools for MTG players.',
    icon: '🎴',
    color: '#667eea',
    status: 'active'
  },
  {
    id: 'warhammer',
    name: 'Warhammer 40,000',
    description: 'Army builder and roster management for the grim darkness of the far future.',
    icon: '⚔️',
    color: '#dc2626',
    status: 'placeholder'
  }
];

interface HomePageProps {
  onSelectGame: (game: GameType) => void;
}

export function HomePage({ onSelectGame }: HomePageProps) {
  const [hoveredGame, setHoveredGame] = useState<GameType | null>(null);

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-logo">🎲</div>
        <h1 className="home-title">Tabletop Tools</h1>
        <p className="home-subtitle">
          Your companion for tabletop gaming. Build decks, manage armies, and optimize your strategies.
        </p>
      </div>

      <div className="game-selection">
        <h2 className="section-title">Select Your Game</h2>
        <div className="game-grid">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className={`game-card ${game.status === 'active' ? 'active' : 'inactive'} ${hoveredGame === game.id ? 'hovered' : ''}`}
              onClick={() => game.status !== 'coming-soon' && onSelectGame(game.id)}
              onMouseEnter={() => setHoveredGame(game.id)}
              onMouseLeave={() => setHoveredGame(null)}
              style={{
                '--game-color': game.color
              } as React.CSSProperties}
            >
              <div className="game-card-icon">{game.icon}</div>
              <h3 className="game-card-title">{game.name}</h3>
              <p className="game-card-description">{game.description}</p>
              {game.status === 'coming-soon' && (
                <span className="game-card-badge coming-soon">Coming Soon</span>
              )}
              {game.status === 'placeholder' && (
                <span className="game-card-badge placeholder">Preview</span>
              )}
              {game.status === 'active' && (
                <span className="game-card-badge active">Available</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="home-features">
        <h2 className="section-title">Platform Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Collection Management</h3>
            <p>Track your cards, miniatures, and game pieces across all your games.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Smart Analysis</h3>
            <p>Get insights into your builds with synergy detection and optimization tips.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>Local Storage</h3>
            <p>All your data stays on your device. No account required.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Works Everywhere</h3>
            <p>Use on desktop, tablet, or phone. Your tools go where you go.</p>
          </div>
        </div>
      </div>

      <footer className="home-footer">
        <p>Built for the tabletop gaming community</p>
        <p className="footer-domain">tabletoptools.cc</p>
      </footer>
    </div>
  );
}
