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
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  // Handle scroll behavior for header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when scrolling up, hide when scrolling down
      // But always show when at the top
      if (currentScrollY < 10) {
        setHeaderVisible(true);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down (only hide after scrolling past 100px)
        setHeaderVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
        className={`sticky-header ${headerVisible ? 'visible' : 'hidden'}`}
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
                <h4>Majeggstics Dashboard</h4>
                <p>A place to see your historical player data, live leaderboards from Wonky data and weekly trends.</p>
                <p>Your historical data dates back to October 2023, or since when you joined Maj</p>
                <br />
                <strong>Features:</strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                  <li>Your historical data</li>
                  <li>Leaderboards and rankings</li>
                  <li>Community trends over time</li>
                </ul>
                <br />
                <p>
                  <a
                    href="https://github.com/ToffePeer1/majeggstics-dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    View on GitHub
                  </a>
                </p>
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
        <div>
          Built with React & TypeScript, by @toffepeer1 | Data from Wonky, stored in Supabase
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <a
            href="https://github.com/ToffePeer1/majeggstics-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
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
