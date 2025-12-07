// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Refresh Leaderboard Cron Job Edge Function
 * 
 * This edge function is triggered every 15 minutes by pg_cron.
 * 
 * WORKFLOW:
 * =========
 * 1. Verify JWT authorization (bearer token from cron job)
 * 2. Fetch fresh data from bot API (always, regardless of cache)
 * 3. Get excluded player IDs from database
 * 4. Update leaderboard_cache table (always)
 * 5. Evaluate snapshot decision logic (should we save historical snapshot?)
 * 6. If conditions met: call update-player-data internally
 * 7. Update snapshot_save_metadata with decision
 * 8. Check for week-no-update alert
 * 
 * SECURITY:
 * =========
 * - Requires valid JWT in Authorization header
 * - JWT must be from service role (set in cron job config)
 * - Only callable via authenticated request
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

import type { 
  BotApiPlayer, 
  LeaderboardCacheEntry, 
  SnapshotSaveMetadata,
  UpdatePlayerDataRequest,
  UpdatePlayerDataResponse
} from '../_shared/types.ts';
import { 
  shouldSaveSnapshot, 
  shouldSendWeekNoUpdateAlert,
  createPendingSyncData
} from '../_shared/snapshot-logic.ts';
import { 
  sendEmail, 
  logEmail,
  createWeekNoUpdateEmail
} from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BATCH_SIZE = 100;

/**
 * Verify JWT from Authorization header
 */
async function verifyJWT(authHeader: string | null, jwtSecret: string): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    await verify(token, cryptoKey);
    return true;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return false;
  }
}

/**
 * Fetch data from bot API
 */
async function fetchFromBotAPI(botApiUrl: string): Promise<BotApiPlayer[]> {
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
  return players;
}

/**
 * Get excluded player IDs from database
 */
async function getExcludedPlayerIds(supabase): Promise<string[]> {
  const { data, error } = await supabase
    .from('excluded_players')
    .select('discord_id');

  if (error) {
    console.error('Failed to fetch excluded players:', error);
    return [];
  }

  return (data || []).map(row => row.discord_id);
}

/**
 * Transform bot API player to leaderboard cache format
 */
function transformToLeaderboardCache(player: BotApiPlayer): LeaderboardCacheEntry {
  return {
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
  };
}

/**
 * Update leaderboard cache in database
 */
async function updateLeaderboardCache(
  supabase,
  players: BotApiPlayer[]
): Promise<void> {
  console.log(`Updating leaderboard cache with ${players.length} players...`);

  const cacheEntries = players.map(transformToLeaderboardCache);

  // Clear existing cache
  const { error: deleteError } = await supabase
    .from('leaderboard_cache')
    .delete()
    .neq('discord_id', '');

  if (deleteError) {
    throw new Error(`Failed to clear cache: ${deleteError.message}`);
  }

  // Insert new data in batches
  for (let i = 0; i < cacheEntries.length; i += BATCH_SIZE) {
    const batch = cacheEntries.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('leaderboard_cache')
      .insert(batch);

    if (insertError) {
      throw new Error(`Failed to insert cache batch: ${insertError.message}`);
    }
  }

  // Update cache metadata
  const { error: metaError } = await supabase
    .from('leaderboard_cache_metadata')
    .upsert({
      id: 1,
      last_updated: new Date().toISOString(),
    });

  if (metaError) {
    console.warn('Failed to update cache metadata:', metaError);
  }

  console.log('Leaderboard cache updated successfully');
}

/**
 * Get snapshot save metadata from database
 */
async function getSnapshotMetadata(supabase): Promise<SnapshotSaveMetadata | null> {
  const { data, error } = await supabase
    .from('snapshot_save_metadata')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.log('No snapshot metadata found, initializing...');
    return null;
  }

  return data;
}

/**
 * Update snapshot save metadata
 */
async function updateSnapshotMetadata(
  supabase,
  updates: Partial<SnapshotSaveMetadata>
): Promise<void> {
  const { error } = await supabase
    .from('snapshot_save_metadata')
    .update(updates)
    .eq('id', 1);

  if (error) {
    console.error('Failed to update snapshot metadata:', error);
  }
}

/**
 * Call update-player-data edge function internally
 */
async function callUpdatePlayerData(
  supabaseUrl: string,
  serviceRoleKey: string,
  request: UpdatePlayerDataRequest
): Promise<UpdatePlayerDataResponse> {
  const response = await fetch(`${supabaseUrl}/functions/v1/update-player-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'x-internal-call': 'true',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`update-player-data failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const notificationEmail = Deno.env.get('NOTIFICATION_EMAIL');

    if (!jwtSecret || !supabaseUrl || !supabaseServiceKey || !botApiUrl) {
      throw new Error('Missing required environment variables');
    }

    // Verify JWT authorization
    const authHeader = req.headers.get('Authorization');
    const isAuthorized = await verifyJWT(authHeader, jwtSecret);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing JWT' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('=== Refresh Leaderboard Cron Started ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch fresh data from bot API
    const players = await fetchFromBotAPI(botApiUrl);

    // Step 2: Get excluded player IDs
    const excludedIds = await getExcludedPlayerIds(supabase);
    console.log(`Excluded players: ${excludedIds.length}`);

    // Step 3: Update leaderboard cache (always)
    await updateLeaderboardCache(supabase, players);

    // Step 4: Get current snapshot metadata
    const metadata = await getSnapshotMetadata(supabase);

    // Step 5: Evaluate snapshot decision
    const decision = await shouldSaveSnapshot(players, excludedIds, metadata);
    console.log('Snapshot decision:', JSON.stringify(decision, null, 2));

    // Step 6: Update metadata with decision
    await updateSnapshotMetadata(supabase, {
      last_decision_at: new Date().toISOString(),
      last_decision_result: decision,
    });

    let snapshotResult: UpdatePlayerDataResponse | null = null;

    // Step 7: Handle snapshot saving
    if (decision.shouldSave) {
      console.log('Conditions met, saving snapshot...');

      // Call update-player-data
      snapshotResult = await callUpdatePlayerData(supabaseUrl, supabaseServiceKey, {
        internalCall: true,
        players: players,
        snapshotDate: new Date().toISOString().split('T')[0],
        sendEmail: true,
        emailContext: {
          syncPercentage: decision.syncPercentage,
          missingPlayers: decision.missingPlayers,
          isPartialSync: decision.syncPercentage < 100,
        },
      });

      // Update metadata with save timestamp and clear pending sync
      await updateSnapshotMetadata(supabase, {
        last_saved_at: new Date().toISOString(),
        pending_sync_data: null,
        pending_sync_first_attempt: null,
        pending_sync_attempt_count: 0,
        pending_sync_metadata: null,
      });

      console.log('Snapshot saved successfully');
    } else if (decision.isPendingSync) {
      // Store pending sync data for next attempt
      console.log('Storing pending sync data for retry...');

      const pendingSyncData = createPendingSyncData(players, decision);

      await updateSnapshotMetadata(supabase, {
        pending_sync_data: pendingSyncData,
        pending_sync_first_attempt: metadata?.pending_sync_first_attempt || new Date().toISOString(),
        pending_sync_attempt_count: decision.pendingAttemptCount,
        pending_sync_metadata: {
          syncPercentage: decision.syncPercentage,
          missingPlayers: decision.missingPlayers,
        },
      });
    } else {
      console.log('Conditions not met, no snapshot saved');
      console.log('Reason:', decision.reason);
    }

    // Step 8: Check for week-no-update alert
    if (resendApiKey && notificationEmail) {
      const shouldAlert = shouldSendWeekNoUpdateAlert(metadata);

      if (shouldAlert) {
        console.log('Sending week-no-update alert email...');

        const emailData = createWeekNoUpdateEmail(
          notificationEmail,
          decision,
          decision.hoursSinceLastSave,
          metadata?.last_saved_at || null
        );

        const emailResult = await sendEmail(emailData, resendApiKey);
        await logEmail(supabase, emailData, emailResult);

        if (emailResult.success) {
          await updateSnapshotMetadata(supabase, {
            last_email_sent_at: new Date().toISOString(),
            last_email_type: 'week_no_update',
          });
          console.log('Alert email sent successfully');
        } else {
          console.error('Alert email failed:', emailResult.error);
        }
      }
    }

    // Return success response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      leaderboardCacheUpdated: true,
      playerCount: players.length,
      excludedCount: excludedIds.length,
      decision: {
        shouldSave: decision.shouldSave,
        syncPercentage: decision.syncPercentage,
        reason: decision.reason,
        isPendingSync: decision.isPendingSync,
      },
      snapshotSaved: decision.shouldSave,
      snapshotResult: snapshotResult ? {
        snapshotDate: snapshotResult.snapshotDate,
        playerCount: snapshotResult.playerCount,
        snapshotsInserted: snapshotResult.snapshots.inserted,
        emailSent: snapshotResult.emailSent,
      } : null,
    };

    console.log('=== Refresh Leaderboard Cron Completed ===');

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Refresh leaderboard cron error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ 
        error: 'Cron job failed', 
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
