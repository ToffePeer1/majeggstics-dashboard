import getUsers from '../_shared/wonky.ts';
import type {
  BotApiPlayer,
  UpdatePlayerDataRequest,
  UpdatePlayerDataResponse,
  SnapshotDecision,
} from '../_shared/types.ts';
import {
  sendEmail,
  logEmail,
  createSnapshotSavedEmail,
  createPartialSyncEmail,
} from '../_shared/email-service.ts';
import { getEnvVariable, getSupabaseClient, type SupabaseClient } from '../_shared/utils.ts';
import { Database } from '../_shared/database.types.ts';

const BATCH_SIZE = 100;
function validateDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function transformPlayer(player: BotApiPlayer, snapshotDate: string) {
  return {
    snapshot_date: snapshotDate,
    discord_id: player.ID,
    ign: player.IGN,
    discord_name: player.discordName,
    display_name: player.displayName || null,
    farmer_role: player.farmerRole || null,
    grade: player.grade,
    active: player.active !== undefined ? player.active : true,
    is_guest: player.isGuest || false,
    eb: player.EB,
    se: player.SE,
    pe: player.PE,
    te: player.TE || null,
    num_prestiges: player.numPrestiges || null,
    updated_at: validateDate(player.updatedAt),
    gains_saturday: player.gains?.saturday || player.gains?.session || null,
    max_mystical_eggs: player.maxMysticalEggs || null,
  };
}

function extractEggdayGains(player: BotApiPlayer) {
  if (
    !player.gains?.eggDay ||
    !Array.isArray(player.gains.eggDay) ||
    player.gains.eggDay.length === 0
  ) {
    return [];
  }
  return player.gains.eggDay.map((eggDay) => ({
    discord_id: player.ID,
    year: eggDay.year,
    start_se: eggDay.eggDayStartSE || null,
    start_pe: eggDay.eggDayStartPE || null,
    start_eb: eggDay.eggDayStartEB || null,
    start_role: eggDay.eggDayStartRole || null,
    start_prestiges: eggDay.eggDayStartPrestiges || null,
    end_se: eggDay.eggDayEndSE || null,
    end_pe: eggDay.eggDayEndPE || null,
    end_eb: eggDay.eggDayEndEB || null,
    end_role: eggDay.eggDayEndRole || null,
    end_prestiges: eggDay.eggDayEndPrestiges || null,
  }));
}
async function batchUpsert(
  supabase: SupabaseClient,
  table: keyof Database['public']['Tables'],
  // deno-lint-ignore no-explicit-any
  data: any[],
  conflictColumns: string[]
) {
  const batches = [];
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    batches.push(data.slice(i, i + BATCH_SIZE));
  }
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const { error } = await supabase.from(table).upsert(batch, {
        onConflict: conflictColumns.join(','),
        ignoreDuplicates: false,
      });
      if (error) {
        console.error(`Batch ${i + 1}/${batches.length} failed:`, error.message);
        errorCount += batch.length;
        errors.push(`Batch ${i + 1}: ${error.message}`);
      } else {
        successCount += batch.length;
        console.log(`Batch ${i + 1}/${batches.length} complete`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Batch ${i + 1}/${batches.length} error:`, errorMsg);
      errorCount += batch.length;
      errors.push(`Batch ${i + 1}: ${errorMsg}`);
    }
  }
  return {
    successCount,
    errorCount,
    errors,
  };
}
async function refreshMaterializedViews(supabase: SupabaseClient) {
  console.log('Refreshing materialized views...');
  const { error: refreshError } = await supabase.rpc('refresh_materialized_views');

  if (refreshError) {
    const errorMessage = 'Failed to refresh materialized views:\n' + refreshError;
    return errorMessage;
  } else {
    return 'Successfully refreshed all materialized views';
  }
}
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Authorization, x-secret-token, x-internal-call',
      },
    });
  }
  try {
    // Parse request body
    const body: UpdatePlayerDataRequest = await req.json();

    // Check if this is an internal call from another edge function
    const isInternalCall =
      body.internalCall === true && req.headers.get('x-internal-call') === 'true';

    // Authentication: Always require either secret token OR service role key
    const secretToken = req.headers.get('x-secret-token');
    const authHeader = req.headers.get('Authorization');
    const expectedToken = getEnvVariable('SECRET_TOKEN');
    const serviceRoleKey = getEnvVariable('SUPABASE_SERVICE_ROLE_KEY');

    let isAuthenticated = false;

    // Check for secret token (external calls)
    if (secretToken && secretToken === expectedToken) {
      isAuthenticated = true;
      console.log('Authenticated via secret token');
    }
    // Check for service role key (internal calls from other edge functions)
    else if (authHeader && authHeader.startsWith('Bearer ')) {
      const providedKey = authHeader.replace('Bearer ', '');
      if (providedKey === serviceRoleKey) {
        isAuthenticated = true;
        console.log('Authenticated via service role key');
      }
    }

    if (!isAuthenticated) {
      console.log('Authentication failed - no valid credentials provided');
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Unauthorized: Invalid or missing credentials. Provide either x-secret-token or valid service role key in Authorization header.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Extract flags
    const dryRun = body.dryRun === true;
    const forceUpdate = body.forceUpdate === true;
    const sendEmailFlag = body.sendEmail !== false; // Default true

    if (dryRun) {
      console.log('⚠️ DRY RUN MODE - No data will be saved');
    }

    if (forceUpdate) {
      console.log('🔄 FORCE UPDATE MODE - Bypassing normal checks');
    }

    // Create Supabase client with service role for admin access
    const supabase = getSupabaseClient();

    let players: BotApiPlayer[];

    // Get player data - either from request body (internal call) or fetch from API
    if (isInternalCall && body.players) {
      console.log('Using player data from internal call...');
      players = body.players;
    } else {
      console.log('Fetching player data from bot API...');
      players = await getUsers();
    }

    console.log(`Received ${players.length} player records`);
    if (!Array.isArray(players) || players.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No player data returned from API',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    // Use current date as snapshot date (format: YYYY-MM-DD)
    const snapshotDate = body.snapshotDate || new Date().toISOString().split('T')[0];
    console.log(`Snapshot date: ${snapshotDate}`);

    // DRY RUN: Skip database operations
    if (dryRun) {
      console.log('Dry run completed - no data saved');
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          snapshotDate,
          playerCount: players.length,
          snapshots: { inserted: 0, errors: 0 },
          eggdayGains: { inserted: 0, errors: 0 },
          errors: [],
          refreshMaterializedViewsResponse: 'Skipped (dry run)',
          message: 'Dry run mode - no data was saved to database',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Transform players
    const playerSnapshots = players.map((player) => transformPlayer(player, snapshotDate));
    // Extract eggday gains
    const allEggdayGains: NonNullable<BotApiPlayer['gains']>['eggDay'] = [];
    players.forEach((player) => {
      const eggdayGains = extractEggdayGains(player);
      allEggdayGains.push(...eggdayGains);
    });
    console.log(`Upserting ${playerSnapshots.length} player snapshots...`);
    const snapshotResult = await batchUpsert(supabase, 'player_snapshots', playerSnapshots, [
      'snapshot_date',
      'discord_id',
    ]);
    let eggdayResult: {
      successCount: number;
      errorCount: number;
      errors: string[];
    } = {
      successCount: 0,
      errorCount: 0,
      errors: [],
    };
    if (allEggdayGains.length > 0) {
      console.log(`Upserting ${allEggdayGains.length} eggday gains...`);
      eggdayResult = await batchUpsert(supabase, 'eggday_gains', allEggdayGains, [
        'discord_id',
        'year',
      ]);
    }
    // Insert snapshot metadata
    const metadata = {
      snapshot_date: snapshotDate,
      record_count: players.length,
      imported_at: new Date().toISOString(),
    };
    const { error: metaError } = await supabase.from('snapshot_metadata').upsert([metadata], {
      onConflict: 'snapshot_date',
    });
    if (metaError) {
      console.error('Metadata insert failed:', metaError.message);
    }
    // Stamp last_saved_at in snapshot_save_metadata so the cron knows a save happened
    // (regardless of whether this was called directly or via the cron)
    const { error: saveMetaError } = await supabase
      .from('snapshot_save_metadata')
      .update({
        last_saved_at: new Date().toISOString(),
        pending_sync_data: null,
        pending_sync_first_attempt: null,
        pending_sync_attempt_count: 0,
        pending_sync_metadata: null,
      })
      .eq('id', 1);
    if (saveMetaError) {
      console.warn('Failed to update snapshot_save_metadata:', saveMetaError.message);
    }

    // Refresh all materialized views after data is loaded
    const refreshMaterializedViewsResponse = await refreshMaterializedViews(supabase);

    // Prepare response
    const response: UpdatePlayerDataResponse = {
      success: true,
      snapshotDate,
      playerCount: players.length,
      snapshots: {
        inserted: snapshotResult.successCount,
        errors: snapshotResult.errorCount,
      },
      eggdayGains: {
        inserted: eggdayResult.successCount,
        errors: eggdayResult.errorCount,
      },
      errors: [...snapshotResult.errors, ...eggdayResult.errors],
      refreshMaterializedViewsResponse,
    };

    // Send email notification if enabled
    if (sendEmailFlag) {
      const resendApiKey = getEnvVariable('RESEND_API_KEY');
      const notificationEmail = getEnvVariable('NOTIFICATION_EMAIL');

      if (resendApiKey && notificationEmail) {
        try {
          const emailContext = body.emailContext ?? {
            syncPercentage: 100,
            missingPlayers: [],
            isPartialSync: false,
          };
          const isPartialSync = emailContext.isPartialSync === true;

          // Create decision object for email template
          const decision: Partial<SnapshotDecision> = {
            syncPercentage: emailContext.syncPercentage,
            totalPlayersReceived: players.length,
            totalNonExcludedPlayers: players.length,
            excludedPlayerCount: 0,
            playersInSyncWindow: players.length,
            lowestUpdatedAt: new Date(),
            timeSinceLowestUpdateHours: 0,
            hoursSinceLastSave: 0,
            reason: isPartialSync ? 'Partial sync detected' : 'All conditions met',
            pendingAttemptCount: isPartialSync ? 2 : 0,
          };

          const emailData = isPartialSync
            ? createPartialSyncEmail(
                notificationEmail,
                snapshotDate,
                players.length,
                decision as SnapshotDecision,
                {
                  snapshotsInserted: snapshotResult.successCount,
                  snapshotsErrors: snapshotResult.errorCount,
                  eggdayInserted: eggdayResult.successCount,
                  eggdayErrors: eggdayResult.errorCount,
                }
              )
            : createSnapshotSavedEmail(
                notificationEmail,
                snapshotDate,
                players.length,
                decision as SnapshotDecision,
                {
                  snapshotsInserted: snapshotResult.successCount,
                  snapshotsErrors: snapshotResult.errorCount,
                  eggdayInserted: eggdayResult.successCount,
                  eggdayErrors: eggdayResult.errorCount,
                }
              );

          const emailResult = await sendEmail(emailData, resendApiKey);
          await logEmail(supabase, emailData, emailResult);

          response.emailSent = emailResult.success;
          if (!emailResult.success) {
            response.emailError = emailResult.error;
            console.error('Failed to send email:', emailResult.error);
          } else {
            console.log('Email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          response.emailSent = false;
          response.emailError =
            emailError instanceof Error ? emailError.message : String(emailError);
        }
      } else {
        console.warn('Email not sent: missing RESEND_API_KEY or NOTIFICATION_EMAIL');
      }
    }

    console.log('Update complete:', response);
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in update-player-data:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
