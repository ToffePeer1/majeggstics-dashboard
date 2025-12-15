// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifyJWT, isAdmin } from '../_shared/auth.ts';

Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-secret-token'
      }
    });
  }
  try {
    const jwtSecret = Deno.env.get('JWT_SECRET');
    const expectedToken = Deno.env.get('SECRET_TOKEN');
    
    if (!jwtSecret || !expectedToken) {
      throw new Error('Missing required environment variables');
    }
    
    // Authentication: Accept either secret token OR admin JWT
    const secretToken = req.headers.get('x-secret-token');
    const authHeader = req.headers.get('Authorization');
    
    let authenticatedUser: string | null = null;
    let authMethod: string | null = null;
    
    // Try JWT authentication first (preferred for audit trail)
    if (authHeader) {
      const jwtPayload = await verifyJWT(authHeader, jwtSecret);
      if (jwtPayload && isAdmin(jwtPayload)) {
        authenticatedUser = jwtPayload.discord_id;
        authMethod = 'admin_jwt';
        console.log(`Authenticated admin user: ${authenticatedUser}`);
      }
    }
    
    // Fall back to secret token (legacy/external calls)
    if (!authenticatedUser && secretToken === expectedToken) {
      authenticatedUser = 'secret_token';
      authMethod = 'secret_token';
      console.log('Authenticated via secret token');
    }
    
    if (!authenticatedUser) {
      console.log('Authentication failed');
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Requires admin JWT or valid secret token'
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
    // Parse request body to get snapshot date
    const body = await req.json();
    const snapshotDate = body.snapshot_date;
    if (!snapshotDate) {
      return new Response(JSON.stringify({
        success: false,
        error: 'snapshot_date is required in request body'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    console.log(`User ${authenticatedUser} (via ${authMethod}) deleting snapshot for date: ${snapshotDate}`);
    
    // Delete from player_snapshots
    const { data: _deletedSnapshots, error: snapshotError, count: snapshotCount } = await supabase.from('player_snapshots').delete({
      count: 'exact'
    }).eq('snapshot_date', snapshotDate);
    if (snapshotError) {
      throw new Error(`Failed to delete player_snapshots: ${snapshotError.message}`);
    }
    // Delete from snapshot_metadata
    const { error: metaError } = await supabase.from('snapshot_metadata').delete().eq('snapshot_date', snapshotDate);
    if (metaError) {
      console.warn(`Failed to delete snapshot_metadata: ${metaError.message}`);
    }
    
    // Log the deletion for audit trail
    const auditLog = {
      action: 'delete_snapshot',
      snapshot_date: snapshotDate,
      deleted_count: snapshotCount || 0,
      performed_by: authenticatedUser,
      auth_method: authMethod,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Audit log:', JSON.stringify(auditLog));
    
    const response = {
      success: true,
      snapshotDate,
      deletedRecords: snapshotCount || 0,
      message: `Deleted ${snapshotCount || 0} player snapshots for ${snapshotDate}`,
      performedBy: authenticatedUser,
    };
    console.log('Delete complete:', response);
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in delete-snapshot:', error);
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
