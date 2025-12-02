import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PAGE_TITLE } from '@/config/constants';
import { getDiscordAvatarUrl } from '@/services/permissions';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get Discord profile data from our custom user object
  const avatarUrl = user ? getDiscordAvatarUrl(user) : null;
  const username = user?.global_name || user?.username || 'User';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          padding: '1rem 0',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
            {PAGE_TITLE}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt={username}
                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: '500' }}>{username}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {isAdmin() ? 'Admin' : 'User'}
                  </div>
                </div>
              </div>
            )}
            <button onClick={handleLogout} className="button button-secondary">
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: '250px',
            background: 'var(--color-bg)',
            borderRight: '1px solid var(--color-border)',
            padding: '1.5rem 1rem',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isAdmin() ? (
              <>
                <NavLink to="/player-profile">
                  Player Profile
                </NavLink>
                <NavLink to="/leaderboards">
                  Leaderboards
                </NavLink>
                <NavLink to="/weekly-trends">
                  Weekly Trends
                </NavLink>
                <NavLink to="/player-comparison">
                  Player Comparison
                </NavLink>
                <NavLink to="/my-stats">
                  My Stats
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/my-stats">
                  My Stats
                </NavLink>
                <div className="info-message" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                  ℹ️ Admin users have access to additional analytics pages.
                </div>
              </>
            )}
          </nav>

          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: '500', marginBottom: '0.5rem' }}>
                ℹ️ About
              </summary>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                <h4>Maj Statistics Analytics</h4>
                <p>Track and analyze player progression, compare performance, and view community trends.</p>
                <br />
                <strong>Features:</strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                  <li>Player profiles with historical data</li>
                  <li>Leaderboards and rankings</li>
                  <li>Community trends over time</li>
                  <li>Multi-player comparisons</li>
                </ul>
              </div>
            </details>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '2rem' }}>
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer
        style={{
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
          padding: '1rem 0',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
        }}
      >
        Built with React & TypeScript | Data from Supabase
      </footer>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'background 0.2s ease',
        textDecoration: 'none',
        color: 'var(--color-text)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span>{children}</span>
    </Link>
  );
}
