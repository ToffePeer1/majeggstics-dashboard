// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Get Leaderboard Edge Function
 * 
 * This edge function provides cached leaderboard data with automatic refresh.
 * 
 * CACHING STRATEGY:
 * =================
 * 1. Check if cached data exists and is fresh (< 15 minutes old)
 * 2. If fresh: return cached data from database
 * 3. If stale: fetch from BOT_API, update cache, return fresh data
 * 
 * SECURITY:
 * =========
 * - Requires valid JWT (same as discord-auth)
 * - Validates access_level from JWT
 * - Admins see num_prestiges, regular users get null for that field
 * - Uses service role key to bypass RLS for cache management
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

// Cache duration in minutes
const CACHE_DURATION_MINUTES = 15;

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
 * Check if the cache is still fresh
 */
function isCacheFresh(lastUpdated: string | null): boolean {
  if (!lastUpdated) return false;

  const lastUpdateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  const ageMinutes = (now - lastUpdateTime) / (1000 * 60);

  console.log(`Cache age: ${ageMinutes.toFixed(2)} minutes (threshold: ${CACHE_DURATION_MINUTES})`);

  return ageMinutes < CACHE_DURATION_MINUTES;
}

/**
 * Fetch fresh data from the bot API
 */
async function fetchFromBotAPI(botApiUrl: string): Promise<LeaderboardPlayer[]> {
  console.log('Fetching fresh data from bot API...');

  const response = await fetch(botApiUrl);
  if (!response.ok) {
    throw new Error(`Bot API returned ${response.status}: ${response.statusText}`);
  }

  const players = await response.json();

  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('No player data returned from bot API');
  }

  console.log(`Received ${players.length} players from bot API`);

  // Transform to our format
  return players.map((player) => ({
    discord_id: player.ID,
    ign: player.IGN,
    display_name: player.displayName || null,
    discord_name: player.discordName,
    eb: player.EB,
    se: player.SE,
    pe: player.PE,
    te: player.TE || null,
    num_prestiges: player.numPrestiges || null,
    farmer_role: player.farmerRole || null,
    grade: player.grade,
    is_guest: player.isGuest || false,
    active: player.active !== undefined ? player.active : true,
  }));
}

/**
 * Update the cache in the database
 */
async function updateCache(
  supabase,
  players: LeaderboardPlayer[]
): Promise<void> {
  console.log(`Updating cache with ${players.length} players...`);

  // Clear existing cache and insert new data
  // Using a transaction-like approach: delete then insert
  const { error: deleteError } = await supabase
    .from('leaderboard_cache')
    .delete()
    .neq('discord_id', ''); // Delete all rows

  if (deleteError) {
    console.error('Failed to clear cache:', deleteError);
    throw new Error(`Failed to clear cache: ${deleteError.message}`);
  }

  // Insert new data in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch = players.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('leaderboard_cache')
      .insert(batch);

    if (insertError) {
      console.error(`Failed to insert batch ${i / BATCH_SIZE + 1}:`, insertError);
      throw new Error(`Failed to insert cache data: ${insertError.message}`);
    }
  }

  // Update the cache metadata
  const { error: metaError } = await supabase
    .from('leaderboard_cache_metadata')
    .upsert({
      id: 1, // Single row table
      last_updated: new Date().toISOString(),
    });

  if (metaError) {
    console.error('Failed to update cache metadata:', metaError);
    // Non-fatal, cache data is still valid
  }

  console.log('Cache updated successfully');
}

/**
 * Get cached data from the database (handles pagination)
 */
async function getCachedData(supabase): Promise<LeaderboardPlayer[]> {
  const allPlayers: LeaderboardPlayer[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('leaderboard_cache')
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch cached data: ${error.message}`);
    }

    if (data && data.length > 0) {
      allPlayers.push(...data);
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allPlayers;
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
    // Table might not exist yet or no data
    console.log('No cache metadata found:', error.message);
    return null;
  }

  return data;
}

/**
 * Filter data based on access level
 * Non-admins don't see num_prestiges
 */
function filterByAccessLevel(
  players: LeaderboardPlayer[],
  accessLevel: 'user' | 'admin'
): LeaderboardPlayer[] {
  if (accessLevel === 'admin') {
    return players;
  }

  // For regular users, set num_prestiges to null
  return players.map(player => ({
    ...player,
    num_prestiges: null,
  }));
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
    const botApiUrl = Deno.env.get('WONKY_ENDPOINT_URL');

    if (!jwtSecret || !supabaseUrl || !supabaseServiceKey || !botApiUrl) {
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

    const accessLevel = jwtPayload.access_level || 'user';
    console.log(`Request from user ${jwtPayload.discord_id} with access level: ${accessLevel}`);

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache freshness
    const cacheMetadata = await getCacheMetadata(supabase);
    const cacheFresh = isCacheFresh(cacheMetadata?.last_updated || null);

    let players: LeaderboardPlayer[];

    if (cacheFresh) {
      console.log('Cache is fresh, returning cached data');
      players = await getCachedData(supabase);
    } else {
      console.log('Cache is stale, fetching fresh data');
      try {
        players = await fetchFromBotAPI(botApiUrl);
        await updateCache(supabase, players);
      } catch (fetchError) {
        // If fetch fails but we have cached data, return stale data
        console.error('Failed to fetch fresh data:', fetchError);
        const cachedPlayers = await getCachedData(supabase);
        if (cachedPlayers.length > 0) {
          console.log('Returning stale cached data due to fetch failure');
          players = cachedPlayers;
        } else {
          throw fetchError;
        }
      }
    }

    // Filter based on access level (hide num_prestiges for non-admins)
    const filteredPlayers = filterByAccessLevel(players, accessLevel);

    const response = {
      players: filteredPlayers,
      lastUpdated: cacheMetadata?.last_updated || new Date().toISOString(),
      playerCount: filteredPlayers.length,
      fromCache: cacheFresh,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: 'Failed to get leaderboard', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
