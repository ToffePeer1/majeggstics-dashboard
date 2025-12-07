import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PAGE_TITLE } from '@/config/constants';
import { getDiscordAvatarUrl } from '@/services/permissions';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={sidebarOpen}
            >
              <span className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
              {PAGE_TITLE}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user && (
              <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt={username}
                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  />
                )}
                <div className="user-details">
                  <div style={{ fontWeight: '500' }}>{username}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {isAdmin() ? 'Admin' : 'User'}
                  </div>
                </div>
              </div>
            )}
            <button onClick={handleLogout} className="button button-secondary logout-btn">
              <svg className="logout-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className="logout-text">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar Overlay (mobile) */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isAdmin() ? (
              <>
                <NavLink to="/my-stats">
                  My Stats
                </NavLink>
                <NavLink to="/player-lookup">
                  Player Lookup
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
              </>
            ) : (
              <>
                <NavLink to="/my-stats">
                  My Stats
                </NavLink>
                <NavLink to="/leaderboards">
                  Leaderboards
                </NavLink>
                <NavLink to="/weekly-trends">
                  Weekly Trends
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
                  <li>Player lookup with historical data</li>
                  <li>Leaderboards and rankings</li>
                  <li>Community trends over time</li>
                  <li>Multi-player comparisons</li>
                </ul>
              </div>
            </details>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
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
