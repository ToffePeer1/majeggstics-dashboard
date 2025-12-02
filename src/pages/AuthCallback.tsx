import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Auth Callback Page
 * 
 * Handles the OAuth callback from Discord:
 * 1. Extracts the authorization code from URL params
 * 2. Sends code to Edge Function via handleAuthCallback
 * 3. Edge Function exchanges code for Discord token and creates JWT
 * 4. On success, redirects to dashboard
 * 
 * SECURITY NOTE:
 * The authorization code is a one-time use token from Discord.
 * It can only be exchanged for an access token using the CLIENT_SECRET,
 * which is only available in the Edge Function.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleAuthCallback, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // Use ref instead of state to prevent effect re-runs
  const isProcessingRef = useRef(false);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      // Prevent double processing - use refs to avoid re-triggering effect
      if (isProcessingRef.current || hasProcessedRef.current) return;
      
      // If already authenticated, redirect to home
      if (isAuthenticated) {
        navigate('/', { replace: true });
        return;
      }

      // Get the authorization code from URL
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle Discord OAuth errors
      if (errorParam) {
        setError(errorDescription || `Discord OAuth error: ${errorParam}`);
        return;
      }

      // Validate we have a code
      if (!code) {
        setError('No authorization code received from Discord. Please try logging in again.');
        return;
      }

      // Mark as processing to prevent duplicate requests
      isProcessingRef.current = true;
      hasProcessedRef.current = true;

      try {
        // Exchange code for JWT via Edge Function
        await handleAuthCallback(code);
        
        // Success! Redirect to home
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Authentication error:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred during authentication. Please try again.'
        );
      } finally {
        isProcessingRef.current = false;
      }
    };

    processCallback();
  }, [searchParams, handleAuthCallback, navigate, isAuthenticated]);

  // Error state
  if (error) {
    const isAccessDenied = error.includes('member of the Majeggstics') || error.includes('Majeggstics role');
    
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
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-danger)' }}>
            {isAccessDenied ? '🚫 Access Denied' : '❌ Authentication Failed'}
          </h1>
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
          {isAccessDenied && (
            <div className="info-message" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <strong>To access this dashboard, you need:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Membership in the Majeggstics Discord server</li>
                <li>The Majeggstics role assigned to your account</li>
              </ul>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                If you believe you should have access, please contact a server administrator.
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/login')}
              className="button button-primary"
            >
              Return to Login
            </button>
          </div>
          
          {!isAccessDenied && (
            <details style={{ marginTop: '2rem', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                🔍 Troubleshooting
              </summary>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
                <p>If you're having trouble logging in:</p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>Make sure you authorized the correct Discord account</li>
                  <li>Try clearing your browser cookies and cache</li>
                  <li>Check if pop-ups are blocked for this site</li>
                  <li>Try using a different browser or incognito mode</li>
                </ul>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  // Loading state
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
      <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
        <h2 style={{ marginTop: '1rem' }}>🔐 Authenticating...</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          Securely verifying your Discord identity.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          This should only take a moment.
        </p>
      </div>
    </div>
  );
}
