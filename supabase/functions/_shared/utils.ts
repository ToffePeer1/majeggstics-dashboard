// Some shared util functions
import { createClient, SupabaseClient as GenericSupabaseClient } from 'supabase';
import { Database } from "./database.types.ts";
export type SupabaseClient = GenericSupabaseClient<Database>;

export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = getEnvVariable('SUPABASE_URL');
  const supabaseKey = getEnvVariable('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(supabaseUrl, supabaseKey);
}

export function getEnvVariable(name: string): string {
  const value = Deno.env.get(name);
  // Return empty if not set, let the caller handle it if it's required
  return value || ""
}

