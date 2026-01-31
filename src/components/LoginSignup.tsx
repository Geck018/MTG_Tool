import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginSignupProps {
  onSuccess?: () => void;
}

export function LoginSignup({ onSuccess }: LoginSignupProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = mode === 'login' 
        ? await login(username)
        : await signup(username, displayName || undefined);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-signup">
      <div className="login-card">
        <div className="login-header">
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>
            {mode === 'login' 
              ? 'Enter your username to continue'
              : 'Choose a username to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="Enter username"
              minLength={3}
              maxLength={20}
              required
              autoComplete="username"
              autoFocus
            />
            <span className="form-hint">Letters, numbers, and underscores only</span>
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="displayName">Display Name (optional)</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you want to be shown"
                maxLength={30}
              />
            </div>
          )}

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading || username.length < 3}
          >
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div className="login-switch">
          {mode === 'login' ? (
            <p>
              New here?{' '}
              <button type="button" onClick={() => { setMode('signup'); setError(''); }}>
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setError(''); }}>
                Log in
              </button>
            </p>
          )}
        </div>

        <div className="login-info">
          <p>No password required - just pick a username!</p>
          <p className="login-info-small">Your data is stored securely in the cloud.</p>
        </div>
      </div>
    </div>
  );
}

// User menu component for when logged in
export function UserMenu() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  return (
    <div className="user-menu">
      <button 
        className="user-menu-button"
        onClick={() => setShowMenu(!showMenu)}
      >
        <span className="user-avatar">
          {(user.display_name || user.username).charAt(0).toUpperCase()}
        </span>
        <span className="user-name">{user.display_name || user.username}</span>
      </button>

      {showMenu && (
        <>
          <div className="user-menu-backdrop" onClick={() => setShowMenu(false)} />
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <span className="user-menu-username">@{user.username}</span>
            </div>
            <button onClick={() => { logout(); setShowMenu(false); }}>
              Log Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
