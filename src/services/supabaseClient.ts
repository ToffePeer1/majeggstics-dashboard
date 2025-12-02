import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV, DISCORD_CONFIG } from '@/config/constants';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file'
  );
}

/**
 * Create the base Supabase client
 * 
 * SECURITY MODEL:
 * ================
 * We use a custom Discord OAuth flow instead of Supabase's built-in OAuth.
 * This allows us to:
 * 1. Control exactly what Discord scopes we request (just 'identify')
 * 2. Sign JWTs in our Edge Function with the Supabase JWT secret
 * 3. Include custom claims (discord_id) that our RLS policies use
 * 
 * The client is created without auto session management since we handle
 * JWT storage and retrieval ourselves.
 */
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,  // We manage JWT refresh ourselves
    persistSession: false,    // We use localStorage directly for JWT
    detectSessionInUrl: false, // We handle the OAuth callback ourselves
  },
});

/**
 * Create a Supabase client with a custom JWT for authenticated requests
 * 
 * This is the key to our security model:
 * - The JWT was signed by our Edge Function with JWT_SECRET
 * - Supabase validates the signature on every request
 * - RLS policies can access claims from the JWT (like discord_id)
 * - Users cannot forge JWTs because they don't have the signing key
 * 
 * @param jwt - The JWT token from our discord-auth Edge Function
 * @returns A Supabase client configured with the custom JWT
 */
export function createAuthenticatedClient(jwt: string): SupabaseClient {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // This header tells Supabase to use our custom JWT for auth
        // Supabase will validate the signature and extract claims
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

/**
 * Get the stored JWT from localStorage
 * Returns null if no JWT is stored or if it's expired
 */
export function getStoredJWT(): string | null {
  try {
    const jwt = localStorage.getItem(DISCORD_CONFIG.JWT_STORAGE_KEY);
    if (!jwt) return null;

    // Check if JWT is expired (with buffer)
    const payload = parseJWT(jwt);
    if (!payload) return null;

    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = DISCORD_CONFIG.EXPIRATION_BUFFER_MS / 1000;
    
    if (payload.exp && payload.exp - bufferSeconds < now) {
      // JWT is expired or about to expire
      clearStoredAuth();
      return null;
    }

    return jwt;
  } catch {
    return null;
  }
}

/**
 * Store JWT in localStorage
 */
export function storeJWT(jwt: string): void {
  localStorage.setItem(DISCORD_CONFIG.JWT_STORAGE_KEY, jwt);
}

/**
 * Store user info in localStorage
 */
export function storeUser(user: { discord_id: string; username: string; global_name: string | null; avatar: string | null }): void {
  localStorage.setItem(DISCORD_CONFIG.USER_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Get stored user from localStorage
 */
export function getStoredUser(): { discord_id: string; username: string; global_name: string | null; avatar: string | null } | null {
  try {
    const userJson = localStorage.getItem(DISCORD_CONFIG.USER_STORAGE_KEY);
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * Clear all stored auth data
 */
export function clearStoredAuth(): void {
  localStorage.removeItem(DISCORD_CONFIG.JWT_STORAGE_KEY);
  localStorage.removeItem(DISCORD_CONFIG.USER_STORAGE_KEY);
}

/**
 * Parse JWT payload without verification
 * 
 * SECURITY NOTE: This is for reading metadata only!
 * Never trust the payload for security decisions on the client.
 * All security verification happens on the Supabase server.
 */
export function parseJWT(jwt: string): { sub: string; exp: number; discord_id: string; access_level?: 'user' | 'admin' } | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Build the Discord OAuth URL
 * 
 * We only request 'identify' scope to get the user's Discord ID.
 * No email, guilds, or other sensitive data is requested.
 */
export function buildDiscordOAuthURL(): string {
  const params = new URLSearchParams({
    client_id: ENV.DISCORD_CLIENT_ID,
    redirect_uri: `${window.location.origin}${DISCORD_CONFIG.CALLBACK_PATH}`,
    response_type: 'code',
    scope: DISCORD_CONFIG.SCOPES.join(' '),
  });

  return `${DISCORD_CONFIG.AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Get the Edge Function URL for Discord auth
 */
export function getDiscordAuthURL(): string {
  return `${ENV.SUPABASE_URL}/functions/v1/discord-auth`;
}
