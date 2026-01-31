interface WarhammerAppProps {
  onBack: () => void;
}

export function WarhammerApp({ onBack }: WarhammerAppProps) {
  return (
    <div className="warhammer-app">
      <header className="app-header warhammer-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Games
        </button>
        <h1>⚔️ Warhammer 40,000 Army Builder</h1>
      </header>

      <main className="warhammer-main">
        <div className="warhammer-hero">
          <div className="warhammer-icon">⚔️</div>
          <h2>Coming Soon</h2>
          <p className="warhammer-tagline">
            "In the grim darkness of the far future, there is only war."
          </p>
        </div>

        <div className="warhammer-preview">
          <h3>Planned Features</h3>
          <div className="feature-list">
            <div className="preview-feature">
              <div className="preview-feature-icon">🛡️</div>
              <div className="preview-feature-content">
                <h4>Army Builder</h4>
                <p>Build and validate army lists for matched play, crusade, and narrative games.</p>
              </div>
            </div>
            <div className="preview-feature">
              <div className="preview-feature-icon">📋</div>
              <div className="preview-feature-content">
                <h4>Detachment Management</h4>
                <p>Organize your forces into detachments with automatic point calculations.</p>
              </div>
            </div>
            <div className="preview-feature">
              <div className="preview-feature-icon">📊</div>
              <div className="preview-feature-content">
                <h4>Datasheet Reference</h4>
                <p>Quick access to unit stats, abilities, and weapon profiles.</p>
              </div>
            </div>
            <div className="preview-feature">
              <div className="preview-feature-icon">🎨</div>
              <div className="preview-feature-content">
                <h4>Paint Tracker</h4>
                <p>Track your painting progress and manage your hobby backlog.</p>
              </div>
            </div>
            <div className="preview-feature">
              <div className="preview-feature-icon">⚔️</div>
              <div className="preview-feature-content">
                <h4>Crusade Roster</h4>
                <p>Manage your crusade force, track experience, and record battle honors.</p>
              </div>
            </div>
            <div className="preview-feature">
              <div className="preview-feature-icon">📱</div>
              <div className="preview-feature-content">
                <h4>Battle Reference</h4>
                <p>Quick reference for stratagems, abilities, and game rules during play.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="warhammer-factions">
          <h3>Supported Factions (Coming Soon)</h3>
          <div className="faction-grid">
            <div className="faction-card imperium">
              <span className="faction-icon">🦅</span>
              <span className="faction-name">Imperium</span>
            </div>
            <div className="faction-card chaos">
              <span className="faction-icon">👹</span>
              <span className="faction-name">Chaos</span>
            </div>
            <div className="faction-card xenos">
              <span className="faction-icon">👽</span>
              <span className="faction-name">Xenos</span>
            </div>
          </div>
        </div>

        <div className="warhammer-cta">
          <p>Want to help build this feature? Get in touch!</p>
          <button className="btn btn-secondary" onClick={onBack}>
            Return to Home
          </button>
        </div>
      </main>
    </div>
  );
}
