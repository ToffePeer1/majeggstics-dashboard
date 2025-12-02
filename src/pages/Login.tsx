import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PAGE_TITLE } from '@/config/constants';

/**
 * Login Page
 * 
 * Initiates Discord OAuth flow with minimal permissions.
 * We only request the 'identify' scope, which provides:
 * - Discord user ID
 * - Username
 * - Avatar
 * 
 * No email, guilds, or other sensitive data is requested.
 * 
 * SECURITY MODEL:
 * 1. User clicks login → Redirect to Discord
 * 2. User authorizes app → Discord redirects back with code
 * 3. Code is sent to our Edge Function (CLIENT_SECRET stays server-side)
 * 4. Edge Function returns signed JWT
 * 5. JWT is used for all authenticated requests
 * 6. Supabase validates JWT signature and applies RLS policies
 */
export default function Login() {
  const { signInWithDiscord } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleDiscordLogin = () => {
    setIsLoading(true);
    // signInWithDiscord redirects to Discord, so no need to handle response
    signInWithDiscord();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div className="card" style={{ maxWidth: '500px', width: '100%', margin: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {PAGE_TITLE}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Please log in with your Discord account to access the dashboard.
          </p>
        </div>

        <div className="info-message" style={{ marginBottom: '1.5rem' }}>
          <strong>Requirements:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
            <li>Must be a member of the <strong>Egg Inc Discord server</strong></li>
            <li>Must have the <strong>Majeggstics role</strong></li>
          </ul>
        </div>

        <button
          onClick={handleDiscordLogin}
          disabled={isLoading}
          className="button button-primary"
          style={{ width: '100%', fontSize: '1rem', padding: '1rem' }}
        >
          {isLoading ? (
            <>
              <span className="spinner" style={{ marginRight: '0.5rem' }}></span>
              Redirecting to Discord...
            </>
          ) : (
            'Login with Discord'
          )}
        </button>

        <details style={{ marginTop: '2rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: '500', marginBottom: '0.5rem' }}>
            ℹ️ About Authentication
          </summary>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
            <h4>How it works</h4>
            <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Click "Login with Discord" to be redirected to Discord</li>
              <li>Authorize the application to access your Discord profile</li>
              <li>You'll be redirected back and automatically logged in</li>
            </ol>

            <h4 style={{ marginTop: '1rem' }}>What data we access</h4>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Your Discord username and ID</li>
              <li>Your server memberships and roles (to verify Majeggstics access)</li>
            </ul>

            <h4 style={{ marginTop: '1rem' }}>Privacy & Security</h4>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>We only request "identify" and "guilds.members.read" scopes</li>
              <li>Authentication tokens are cryptographically signed</li>
              <li>Row Level Security ensures you only see authorized data</li>
              <li>You can revoke access anytime from Discord's Authorized Apps settings</li>
            </ul>

            <h4 style={{ marginTop: '1rem' }}>Security Model</h4>
            <p style={{ marginTop: '0.5rem' }}>
              Your session is secured using industry-standard JWT (JSON Web Tokens) with
              cryptographic signatures. Even though you can see your token in browser storage,
              it cannot be modified without invalidating the signature. All data access is
              protected by Row Level Security policies that verify your identity on every request.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
