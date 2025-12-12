import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  createAuthenticatedClient,
  getStoredJWT,
  getStoredUser,
  storeJWT,
  storeUser,
  clearStoredAuth,
  buildDiscordOAuthURL,
  getDiscordAuthURL,
  parseJWT,
} from '@/services/supabaseClient';
import { DISCORD_CONFIG, ENV } from '@/config/constants';
import type { AuthState, DiscordAuthResponse, AuthErrorResponse } from '@/types';
import { AuthContext } from '@/contexts/AuthContextDef';

// Re-export for convenience
export { AuthContext } from '@/contexts/AuthContextDef';
export type { AuthContextType } from '@/contexts/AuthContextDef';

/**
 * Auth Context for Discord OAuth with custom JWT
 * 
 * SECURITY MODEL:
 * ================
 * 1. User clicks login → Redirected to Discord OAuth (only 'identify' scope)
 * 2. Discord redirects back with authorization code
 * 3. We send code to our Edge Function (discord-auth)
 * 4. Edge Function:
 *    - Exchanges code for Discord token (using CLIENT_SECRET - never exposed)
 *    - Fetches user info from Discord
 *    - Creates JWT signed with JWT_SECRET (never exposed)
 *    - Returns JWT to frontend
 * 5. Frontend stores JWT in localStorage
 * 6. All Supabase requests include JWT in Authorization header
 * 7. Supabase validates JWT signature on every request
 * 8. RLS policies use discord_id claim to filter data
 * 
 * WHY THIS IS SECURE:
 * - JWT signing key is never exposed to client
 * - Users can see JWT but cannot forge valid signatures
 * - Any JWT modification invalidates the signature
 * - Supabase rejects requests with invalid signatures
 */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    session: null,
    accessLevel: null,
    discordId: null,
    isLoading: true,
    jwt: null,
    expiresAt: null,
  });

  /**
   * Log out and clear all stored auth data
   */
  const logout = useCallback(() => {
    clearStoredAuth();
    setAuthState({
      isAuthenticated: false,
      user: null,
      session: null,
      accessLevel: null,
      discordId: null,
      isLoading: false,
      jwt: null,
      expiresAt: null,
    });
  }, []);

  /**
   * Initialize auth state from localStorage on mount
   * Checks for existing valid JWT and user data
   */
  useEffect(() => {
    const initializeAuth = () => {
      const jwt = getStoredJWT();
      const user = getStoredUser();

      if (jwt && user) {
        const payload = parseJWT(jwt);
        setAuthState({
          isAuthenticated: true,
          user,
          session: null, // We don't use Supabase sessions
          accessLevel: payload?.access_level || 'user',
          discordId: user.discord_id,
          isLoading: false,
          jwt,
          expiresAt: payload?.exp ? payload.exp * 1000 : null,
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    initializeAuth();
  }, []);

  /**
   * Set up JWT expiration check
   * Automatically logs out user when JWT expires
   */
  useEffect(() => {
    if (!authState.expiresAt) return;

    const checkExpiration = () => {
      const now = Date.now();
      if (authState.expiresAt && now >= authState.expiresAt) {
        console.log('JWT expired, logging out');
        logout();
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, [authState.expiresAt, logout]);

  /**
   * Redirect to Discord OAuth
   * Only requests 'identify' scope - minimum required permissions
   */
  const signInWithDiscord = useCallback(() => {
    const url = buildDiscordOAuthURL();
    window.location.href = url;
  }, []);

  /**
   * Handle OAuth callback from Discord
   * Sends authorization code to Edge Function and stores returned JWT
   */
  const handleAuthCallback = useCallback(async (code: string): Promise<void> => {
    try {
      const response = await fetch(getDiscordAuthURL(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Required for Supabase Edge Functions - identifies the project
          'apikey': ENV.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          code,
          redirect_uri: `${window.location.origin}${DISCORD_CONFIG.CALLBACK_PATH}`,
        }),
      });

      if (!response.ok) {
        const errorData: AuthErrorResponse = await response.json();
        // Check for message field first (used for access denied errors), then details, then error code
        throw new Error(errorData.message || errorData.details || errorData.error || 'Authentication failed');
      }

      const data: DiscordAuthResponse = await response.json();

      // Store JWT and user info
      storeJWT(data.jwt);
      storeUser(data.user);

      // Update auth state
      setAuthState({
        isAuthenticated: true,
        user: data.user,
        session: null,
        accessLevel: data.access_level,
        discordId: data.user.discord_id,
        isLoading: false,
        jwt: data.jwt,
        expiresAt: data.expires_at * 1000, // Convert to milliseconds
      });
    } catch (error) {
      console.error('Auth callback error:', error);
      throw error;
    }
  }, []);

  /**
   * Check if user has admin access
   * Access level is determined by the Edge Function based on Discord roles
   */
  const isAdmin = useCallback((): boolean => {
    return authState.accessLevel === 'admin';
  }, [authState.accessLevel]);

  /**
   * Get a Supabase client configured with the user's JWT
   * Use this for all authenticated database requests
   * 
   * The JWT is included in the Authorization header, and Supabase
   * validates the signature and extracts claims for RLS policies
   */
  const getAuthenticatedClient = useCallback(() => {
    if (!authState.jwt) return null;
    return createAuthenticatedClient(authState.jwt);
  }, [authState.jwt]);

  // Show loading state while checking stored auth
  if (authState.isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signInWithDiscord,
        handleAuthCallback,
        logout,
        isAdmin,
        getAuthenticatedClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
