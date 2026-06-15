import { getEnvVariable, getSupabaseClient } from '../_shared/utils.ts'
import { verifyJWT, isOwner } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type OwnerAction = 'force-update' | 'dry-run' | 'get-status' | 'mark-saved'

interface OwnerActionRequest {
  action: OwnerAction
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const jwtSecret = getEnvVariable('JWT_SECRET')
    const supabase = getSupabaseClient()

    const authHeader = req.headers.get('Authorization')
    const payload = await verifyJWT(authHeader, jwtSecret)

    if (!isOwner(payload)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Owner access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: OwnerActionRequest = await req.json()
    const { action } = body

    if (action === 'get-status') {
      const { data, error } = await supabase
        .from('snapshot_save_metadata')
        .select('*')
        .eq('id', 1)
        .single()

      if (error) {
        throw new Error(`Failed to fetch status: ${error.message}`)
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'mark-saved') {
      const { error } = await supabase
        .from('snapshot_save_metadata')
        .update({
          last_saved_at: new Date().toISOString(),
          pending_sync_data: null,
          pending_sync_first_attempt: null,
          pending_sync_attempt_count: 0,
          pending_sync_metadata: null,
        })
        .eq('id', 1)

      if (error) throw new Error(`Failed to update metadata: ${error.message}`)

      return new Response(JSON.stringify({ success: true, message: 'Marked as saved now' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'force-update' || action === 'dry-run') {
      const { data, error } = await supabase.functions.invoke('update-player-data', {
        body: {
          forceUpdate: action === 'force-update',
          dryRun: action === 'dry-run',
          sendEmail: action === 'force-update',
        },
      })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Owner action error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: 'Action failed', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
