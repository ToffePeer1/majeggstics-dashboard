// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Get Player Current Stats Edge Function
 * 
 * This edge function provides a player's current stats from the leaderboard cache.
 * Can be used for:
 * - User viewing their own stats (discord_id from JWT)
 * - Admin viewing any player's stats (discord_id from query parameter)
 * 
 * SECURITY:
 * =========
 * - Requires valid JWT (same as discord-auth)
 * - If no discord_id param: uses discord_id from JWT (user's own stats)
 * - If discord_id param provided: only admins can query other players
 * - Validates access_level from JWT
 * - Admins see num_prestiges, regular users get null for that field
 * - Uses service role key to bypass RLS for cache access
 * 
 * PERFORMANCE:
 * ============
 * - Single row query (WHERE discord_id = ?) is instant (PRIMARY KEY)
 * - No pagination needed
 * - Reuses existing leaderboard cache (no separate API call)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

interface LeaderboardPlayer {
  discord_id: string;
  ign: string;
  display_name: string | null;
  discord_name: string;
  eb: number;
  se: number;
  pe: number;
  te: number | null;
  num_prestiges: number | null;
  farmer_role: string | null;
  grade: string;
  is_guest: boolean;
  active: boolean;
}

interface CacheMetadata {
  id: number;
  last_updated: string;
}

interface JWTPayload {
  sub: string;
  discord_id: string;
  access_level: 'user' | 'admin';
  exp: number;
}

/**
 * Verify and decode the JWT from the Authorization header
 */
async function verifyJWT(authHeader: string | null, jwtSecret: string): Promise<JWTPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
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

    const payload = await verify(token, cryptoKey);
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Get cache metadata (last update time)
 */
async function getCacheMetadata(supabase): Promise<CacheMetadata | null> {
  const { data, error } = await supabase
    .from('leaderboard_cache_metadata')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.log('No cache metadata found:', error.message);
    return null;
  }

  return data;
}

/**
 * Get current stats for a specific player from cache
 */
async function getPlayerFromCache(
  supabase,
  discordId: string
): Promise<LeaderboardPlayer | null> {
  const { data, error } = await supabase
    .from('leaderboard_cache')
    .select('*')
    .eq('discord_id', discordId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - player not in cache
      return null;
    }
    throw new Error(`Failed to fetch player from cache: ${error.message}`);
  }

  return data;
}

/**
 * Filter data based on access level
 * Non-admins don't see num_prestiges
 */
function filterByAccessLevel(
  player: LeaderboardPlayer | null,
  accessLevel: 'user' | 'admin'
): LeaderboardPlayer | null {
  if (!player) return null;
  
  if (accessLevel === 'admin') {
    return player;
  }

  // For regular users, set num_prestiges to null
  return {
    ...player,
    num_prestiges: null,
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Validate environment variables
    const jwtSecret = Deno.env.get('JWT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!jwtSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    const jwtPayload = await verifyJWT(authHeader, jwtSecret);

    if (!jwtPayload) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing JWT' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check JWT expiration
    if (jwtPayload.exp && jwtPayload.exp < Date.now() / 1000) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: JWT expired' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const discordId = jwtPayload.discord_id;
    const accessLevel = jwtPayload.access_level || 'user';

    // Get discord_id from query parameter or use JWT discord_id
    const url = new URL(req.url);
    const targetDiscordId = url.searchParams.get('discord_id');

    // Determine which player to query
    let discordIdToQuery: string;
    
    if (targetDiscordId) {
      // Requesting another player's stats - only admins can do this
      if (accessLevel !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Only admins can view other players\' stats' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      discordIdToQuery = targetDiscordId;
      console.log(`Admin ${discordId} requesting stats for ${discordIdToQuery}`);
    } else {
      // No parameter - return own stats
      discordIdToQuery = discordId;
      console.log(`User ${discordId} requesting own stats`);
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get cache metadata to include last updated time
    const cacheMetadata = await getCacheMetadata(supabase);

    // Fetch the player's current stats from cache
    const player = await getPlayerFromCache(supabase, discordIdToQuery);

    // Filter based on access level (hide num_prestiges for non-admins)
    const filteredPlayer = filterByAccessLevel(player, accessLevel);

    const response = {
      player: filteredPlayer,
      lastUpdated: cacheMetadata?.last_updated || new Date().toISOString(),
      fromCache: true,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get player current stats error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: 'Failed to get current stats', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
