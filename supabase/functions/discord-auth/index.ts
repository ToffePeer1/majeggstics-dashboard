// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
/**
 * Discord OAuth Edge Function
 * 
 * SECURITY MODEL:
 * ================
 * This Edge Function is the ONLY place where JWTs are signed. The JWT secret
 * is stored as an environment variable and NEVER exposed to the client.
 * 
 * Flow:
 * 1. User clicks "Login with Discord" → Redirected to Discord OAuth
 * 2. Discord redirects back with authorization code
 * 3. Frontend sends code to this Edge Function
 * 4. Edge Function exchanges code for Discord access token (using CLIENT_SECRET)
 * 5. Edge Function fetches user info from Discord API
 * 6. Edge Function creates a signed JWT containing the Discord user ID
 * 7. Frontend stores JWT and uses it for all Supabase requests
 * 8. Supabase validates JWT signature on every request
 * 9. RLS policies use the discord_id claim to filter data
 * 
 * WHY THIS IS SECURE:
 * - Users can see the JWT in their browser (it's not a secret)
 * - Users CANNOT modify the JWT because they don't have the signing key
 * - Any modification invalidates the cryptographic signature
 * - Supabase rejects requests with invalid signatures
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Discord API endpoints
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
const getGuildMemberURL = (guildId: string) => 
  `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`;

// JWT expiration (7 days in seconds)
const JWT_EXPIRATION_DAYS = 7;

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
}

interface DiscordGuildMember {
  user?: {
    id: string;
  };
  roles: string[];
  nick?: string | null;
}

type AccessLevel = 'user' | 'admin';

interface AuthRequest {
  code: string;
  redirect_uri: string;
}

interface AuthResponse {
  jwt: string;
  user: {
    discord_id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  };
  access_level: AccessLevel;
  expires_at: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Exchange Discord authorization code for access token
 * This uses the CLIENT_SECRET which is only available server-side
 */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<DiscordTokenResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Discord token exchange failed:', errorText);
    throw new Error(`Discord token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch Discord user info using the access token
 */
async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(DISCORD_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Discord user fetch failed:', errorText);
    throw new Error(`Failed to fetch Discord user: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch Discord guild member info to check roles
 * Requires guilds.members.read scope
 */
async function fetchGuildMember(
  accessToken: string,
  guildId: string
): Promise<DiscordGuildMember | null> {
  const response = await fetch(getGuildMemberURL(guildId), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // If user is not in the guild, Discord returns 404
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Discord guild member fetch failed:', errorText);
    throw new Error(`Failed to fetch guild member: ${response.status}`);
  }

  return response.json();
}

/**
 * Determine access level based on Discord roles
 * Returns null if user doesn't have required access
 * User can access if they have either MAJ role or YC role
 * YC role grants admin access automatically
 */
function determineAccessLevel(
  member: DiscordGuildMember | null,
  majRoleId: string,
  ycRoleId: string,
  adminRoleId: string
): AccessLevel | null {
  if (!member || !member.roles) {
    return null;
  }

  // Check if user has either the MAJ role or the YC (Yellow Car) role
  const hasMajRole = member.roles.includes(majRoleId);
  const hasYcRole = member.roles.includes(ycRoleId);
  
  if (!hasMajRole && !hasYcRole) {
    return null;
  }

  // YC role grants admin access automatically, or check for admin role (Wonky Leader)
  const hasAdminRole = member.roles.includes(adminRoleId);
  return (hasYcRole || hasAdminRole) ? 'admin' : 'user';
}

/**
 * Create a JWT signed with Supabase's JWT secret
 * 
 * IMPORTANT: This JWT must match Supabase's expected format for custom JWTs.
 * Required claims:
 * - iss: Issuer URL (your Supabase project URL)
 * - sub: Subject (Discord user ID as UUID format)
 * - aud: Audience ('authenticated' for authenticated users)
 * - role: Postgres role ('authenticated')
 * - iat: Issued at timestamp
 * - exp: Expiration timestamp
 * - discord_id: Custom claim for RLS policies
 */
async function createSupabaseJWT(
  discordUser: DiscordUser,
  accessLevel: AccessLevel,
  jwtSecret: string,
  supabaseUrl: string
): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + JWT_EXPIRATION_DAYS * 24 * 60 * 60;

  // Create the crypto key from the JWT secret
  const encoder = new TextEncoder();
  const keyData = encoder.encode(jwtSecret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  // JWT payload matching Supabase's expected format
  // See: https://supabase.com/docs/guides/auth/jwts
  const payload = {
    // Required standard claims for Supabase
    iss: `${supabaseUrl}/auth/v1`,           // Issuer - your Supabase Auth URL
    sub: discordUser.id,                      // Subject - user ID (Discord ID as string is OK)
    aud: 'authenticated',                     // Audience - must be 'authenticated'
    role: 'authenticated',                    // Postgres role
    iat: getNumericDate(0),                   // Issued at - now
    exp: getNumericDate(JWT_EXPIRATION_DAYS * 24 * 60 * 60), // Expiration
    
    // Required user identity claims
    email: '',                                // Empty if no email (Discord 'identify' scope doesn't provide email)
    phone: '',                                // Empty if no phone
    
    // Custom claims for RLS policies
    discord_id: discordUser.id,               // This is what our RLS policies check
    access_level: accessLevel,                // 'user' or 'admin' - used for data filtering
    
    // Optional app metadata
    app_metadata: {
      provider: 'discord',
      providers: ['discord'],
    },
    
    // Optional user metadata
    user_metadata: {
      discord_username: discordUser.username,
      discord_global_name: discordUser.global_name,
      discord_avatar: discordUser.avatar,
    },
  };

  const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, cryptoKey);

  return { token, expiresAt };
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): {
  clientId: string;
  clientSecret: string;
  jwtSecret: string;
  supabaseUrl: string;
  guildId: string;
  majRoleId: string;
  ycRoleId: string;
  adminRoleId: string;
} {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID');
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');
  const jwtSecret = Deno.env.get('JWT_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const guildId = Deno.env.get('EGGINC_GUILD');
  const majRoleId = Deno.env.get('EGGINC_MAJ_ROLE');
  const ycRoleId = Deno.env.get('EGGINC_YC_ROLE');
  const adminRoleId = Deno.env.get('EGGINC_WONKY_LEADER_ROLE');

  if (!clientId) {
    throw new Error('Missing DISCORD_CLIENT_ID environment variable');
  }
  if (!clientSecret) {
    throw new Error('Missing DISCORD_CLIENT_SECRET environment variable');
  }
  if (!jwtSecret) {
    throw new Error('Missing JWT_SECRET environment variable');
  }
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  if (!guildId) {
    throw new Error('Missing EGGINC_GUILD environment variable');
  }
  if (!majRoleId) {
    throw new Error('Missing EGGINC_MAJ_ROLE environment variable');
  }
  if (!ycRoleId) {
    throw new Error('Missing EGGINC_YC_ROLE environment variable');
  }
  if (!adminRoleId) {
    throw new Error('Missing EGGINC_WONKY_LEADER_ROLE environment variable');
  }

  return { clientId, clientSecret, jwtSecret, supabaseUrl, guildId, majRoleId, ycRoleId, adminRoleId };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' } as ErrorResponse),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Validate environment variables
    const { clientId, clientSecret, jwtSecret, supabaseUrl, guildId, majRoleId, ycRoleId, adminRoleId } = validateEnvironment();

    // Parse request body
    const body: AuthRequest = await req.json();

    if (!body.code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' } as ErrorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'Missing redirect_uri' } as ErrorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing Discord OAuth for code:', body.code.substring(0, 10) + '...');

    // Step 1: Exchange code for Discord access token
    // This is where CLIENT_SECRET is used - it's never sent to the client
    const tokenResponse = await exchangeCodeForToken(
      body.code,
      body.redirect_uri,
      clientId,
      clientSecret
    );

    console.log('Successfully exchanged code for token');

    // Step 2: Fetch Discord user info
    const discordUser = await fetchDiscordUser(tokenResponse.access_token);

    console.log('Successfully fetched Discord user:', discordUser.id);

    // Step 3: Check guild membership and roles
    const guildMember = await fetchGuildMember(tokenResponse.access_token, guildId);
    const accessLevel = determineAccessLevel(guildMember, majRoleId, ycRoleId, adminRoleId);

    if (!accessLevel) {
      console.log('User does not have required access:', discordUser.id);
      return new Response(
        JSON.stringify({
          error: 'access_denied',
          message: 'You must be a member of the Majeggstics Discord server with the Majeggstics role to access this dashboard.',
        } as ErrorResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User has access level:', accessLevel);

    // Step 4: Create a signed JWT for Supabase
    // This JWT is signed with JWT_SECRET and includes the proper iss claim
    const { token, expiresAt } = await createSupabaseJWT(discordUser, accessLevel, jwtSecret, supabaseUrl);

    console.log('Successfully created JWT for user:', discordUser.id);

    // Return the JWT and user info
    const response: AuthResponse = {
      jwt: token,
      user: {
        discord_id: discordUser.id,
        username: discordUser.username,
        global_name: discordUser.global_name,
        avatar: discordUser.avatar,
      },
      access_level: accessLevel,
      expires_at: expiresAt,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Discord auth error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if this is an authorization error (not authentication)
    const isAuthorizationError = errorMessage.includes('UNAUTHORIZED:');
    const status = isAuthorizationError ? 403 : 500;
    
    const response: ErrorResponse = {
      error: isAuthorizationError ? 'Access Denied' : 'Authentication failed',
      details: errorMessage.replace('UNAUTHORIZED: ', ''),
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
