// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
const BATCH_SIZE = 100;
function validateDate(date) {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function transformPlayer(player, snapshotDate) {
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
    gains_saturday: player.gains?.saturday || null,
    max_mystical_eggs: player.maxMysticalEggs || null
  };
}
function extractEggdayGains(player) {
  if (!player.gains?.eggDay || !Array.isArray(player.gains.eggDay) || player.gains.eggDay.length === 0) {
    return [];
  }
  return player.gains.eggDay.map((eggDay)=>({
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
      end_prestiges: eggDay.eggDayEndPrestiges || null
    }));
}
async function batchUpsert(supabase, table, data, conflictColumns) {
  const batches = [];
  for(let i = 0; i < data.length; i += BATCH_SIZE){
    batches.push(data.slice(i, i + BATCH_SIZE));
  }
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  for(let i = 0; i < batches.length; i++){
    const batch = batches[i];
    try {
      const { error } = await supabase.from(table).upsert(batch, {
        onConflict: conflictColumns.join(','),
        ignoreDuplicates: false
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
    errors
  };
}
async function refreshMaterializedViews(supabase) {
  console.log('Refreshing materialized views...');
  const { error: refreshError } = await supabase
    .rpc('refresh_materialized_views');

  if (refreshError) {
    const errorMessage = 'Failed to refresh materialized views:\n' + refreshError
    return errorMessage
  } else {
    return 'Successfully refreshed all materialized views'
  }
}
Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-secret-token'
      }
    });
  }
  try {
    // Check for secret token
    const secretToken = req.headers.get('x-secret-token');
    const expectedToken = Deno.env.get('SECRET_TOKEN');
    if (!secretToken || secretToken !== expectedToken) {
      secretToken ? console.log(`Got wrong secret token! received: "${secretToken}"`) : console.log(`Got no secret token!`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid or missing secret token. Expected valid "x-secret-token" in header.'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Create Supabase client with service role for admin access
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log('Fetching player data from bot API...');
    // Fetch data from bot API
    const botResponse = await fetch(Deno.env.get('WONKY_ENDPOINT_URL'));
    if (!botResponse.ok) {
      throw new Error(`Bot API returned ${botResponse.status}: ${botResponse.statusText}`);
    }
    const players = await botResponse.json();
    console.log(`Received ${players.length} player records`);
    if (!Array.isArray(players) || players.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No player data returned from API'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Use current date as snapshot date (format: YYYY-MM-DD)
    const snapshotDate = new Date().toISOString().split('T')[0];
    console.log(`Snapshot date: ${snapshotDate}`);
    // Transform players
    const playerSnapshots = players.map((player)=>transformPlayer(player, snapshotDate));
    // Extract eggday gains
    const allEggdayGains = [];
    players.forEach((player)=>{
      const eggdayGains = extractEggdayGains(player);
      allEggdayGains.push(...eggdayGains);
    });
    console.log(`Upserting ${playerSnapshots.length} player snapshots...`);
    const snapshotResult = await batchUpsert(supabase, 'player_snapshots', playerSnapshots, [
      'snapshot_date',
      'discord_id'
    ]);
    let eggdayResult = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };
    if (allEggdayGains.length > 0) {
      console.log(`Upserting ${allEggdayGains.length} eggday gains...`);
      eggdayResult = await batchUpsert(supabase, 'eggday_gains', allEggdayGains, [
        'discord_id',
        'year'
      ]);
    }
    // Insert snapshot metadata
    const metadata = {
      snapshot_date: snapshotDate,
      record_count: players.length,
      imported_at: new Date().toISOString()
    };
    const { error: metaError } = await supabase.from('snapshot_metadata').upsert([
      metadata
    ], {
      onConflict: 'snapshot_date'
    });
    if (metaError) {
      console.error('Metadata insert failed:', metaError.message);
    }
    // Refresh all materialized views after data is loaded
    const refreshMaterializedViewsResponse = await refreshMaterializedViews(supabase);
    const response = {
      success: true,
      snapshotDate,
      playerCount: players.length,
      snapshots: {
        inserted: snapshotResult.successCount,
        errors: snapshotResult.errorCount
      },
      eggdayGains: {
        inserted: eggdayResult.successCount,
        errors: eggdayResult.errorCount
      },
      errors: [
        ...snapshotResult.errors,
        ...eggdayResult.errors
      ],
      refreshMaterializedViewsResponse
    };
    console.log('Update complete:', response);
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in update-player-data:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMsg
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
