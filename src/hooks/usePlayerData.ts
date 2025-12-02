// Custom hooks for data fetching using React Query

import { useQuery } from '@tanstack/react-query';
import { supabase, createAuthenticatedClient, getStoredJWT } from '@/services/supabaseClient';
import { TABLE_PLAYER_SNAPSHOTS, TABLE_SNAPSHOT_METADATA, TABLE_WEEKLY_STATISTICS, VIEW_UNIQUE_PLAYERS_LATEST, CACHE_TTL } from '@/config/constants';
import type { PlayerSnapshot, SnapshotMetadata, PlayerListItem, WeeklyStatistics } from '@/types';

/**
 * Helper function to get the appropriate Supabase client
 * Returns authenticated client if JWT exists, otherwise base client
 * 
 * SECURITY NOTE:
 * - Authenticated client includes JWT in Authorization header
 * - Supabase validates JWT signature on every request
 * - RLS policies use claims from JWT (like discord_id) to filter data
 */
function getClient() {
  const jwt = getStoredJWT();
  if (jwt) {
    return createAuthenticatedClient(jwt);
  }
  return supabase;
}

/**
 * Fetch all player snapshots for the current user
 * 
 * SECURITY: RLS policy ensures users only see their own data:
 * USING (discord_id = (auth.jwt() ->> 'discord_id'))
 * 
 * The discord_id is extracted from the JWT's custom claim.
 * Users cannot forge JWTs because they don't have the signing key.
 */
export function usePlayerSnapshots(discordId: string | null) {
  return useQuery({
    queryKey: ['playerSnapshots', discordId],
    queryFn: async () => {
      if (!discordId) return [];

      const client = getClient();
      
      // The RLS policy will automatically filter to only show this user's data
      // We include the discord_id filter here for clarity and performance
      const { data, error } = await client
        .from(TABLE_PLAYER_SNAPSHOTS)
        .select('*')
        .eq('discord_id', discordId)
        .order('snapshot_date', { ascending: false });
      

      if (error) throw error;
      return (data || []) as PlayerSnapshot[];
    },
    enabled: !!discordId,
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

// Fetch player list for autocomplete using materialized view (admin only - requires proper RLS)
export function usePlayerList() {
  return useQuery({
    queryKey: ['playerList'],
    queryFn: async () => {
      const client = getClient();
      
      // Use the materialized view to get unique players efficiently
      // Paginate through all results like the Streamlit version
      const allData: Array<{ discord_id: string; ign: string; discord_name: string }> = [];
      const pageSize = 1000;
      const maxPages = 100; // Safety limit to prevent infinite loops

      for (let page = 0; page < maxPages; page++) {
        const offset = page * pageSize;
        const { data, error } = await client
          .from(VIEW_UNIQUE_PLAYERS_LATEST)
          .select('discord_id, ign, discord_name')
          .order('ign')
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allData.push(...data);
        
        // Break if we got fewer rows than requested (last page)
        if (data.length < pageSize) break;
      }

      // Create display labels matching Streamlit format: "IGN (discord_name) - discord_id"
      const uniquePlayers: PlayerListItem[] = allData.map((row) => ({
        label: `${row.ign} (${row.discord_name}) - ${row.discord_id}`,
        discordId: row.discord_id,
      }));

      // Sort by label (case-insensitive)
      return uniquePlayers.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
    },
    staleTime: CACHE_TTL.PLAYER_LIST,
  });
}

// Fetch latest snapshot date
export function useLatestSnapshotDate() {
  return useQuery({
    queryKey: ['latestSnapshotDate'],
    queryFn: async () => {
      const client = getClient();
      
      const { data, error } = await client
        .from(TABLE_SNAPSHOT_METADATA)
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data?.snapshot_date || null;
    },
    staleTime: CACHE_TTL.LATEST_SNAPSHOT,
  });
}

// Fetch leaderboard data for a specific snapshot date (admin only)
// Fetches ALL players for the snapshot using pagination, sorting/filtering is done client-side
export function useLeaderboard(snapshotDate: string | null) {
  return useQuery({
    queryKey: ['leaderboard', snapshotDate],
    queryFn: async () => {
      if (!snapshotDate) return [];

      const client = getClient();
      
      // Paginate through all results (Supabase has a 1000 row limit per request)
      const allData: PlayerSnapshot[] = [];
      const pageSize = 1000;
      const maxPages = 100; // Safety limit to prevent infinite loops

      for (let page = 0; page < maxPages; page++) {
        const offset = page * pageSize;
        const { data, error } = await client
          .from(TABLE_PLAYER_SNAPSHOTS)
          .select('discord_id, ign, display_name, eb, se, pe, te, num_prestiges, farmer_role, grade, is_guest, active')
          .eq('snapshot_date', snapshotDate)
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allData.push(...(data as PlayerSnapshot[]));
        
        // Break if we got fewer rows than requested (last page)
        if (data.length < pageSize) break;
      }

      return allData;
    },
    enabled: !!snapshotDate,
    staleTime: CACHE_TTL.LATEST_SNAPSHOT,
  });
}

// Fetch all snapshot metadata
export function useSnapshotMetadata() {
  return useQuery({
    queryKey: ['snapshotMetadata'],
    queryFn: async () => {
      const client = getClient();
      
      const { data, error } = await client
        .from(TABLE_SNAPSHOT_METADATA)
        .select('*')
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return (data || []) as SnapshotMetadata[];
    },
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

// Fetch all player snapshots (for trends - admin only)
export function useAllPlayerSnapshots() {
  return useQuery({
    queryKey: ['allPlayerSnapshots'],
    queryFn: async () => {
      const client = getClient();
      
      const { data, error } = await client
        .from(TABLE_PLAYER_SNAPSHOTS)
        .select('snapshot_date, eb, se, pe, num_prestiges, grade')
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return (data || []) as PlayerSnapshot[];
    },
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

// Fetch multiple players' data for comparison (admin only)
export function usePlayerComparison(discordIds: string[]) {
  return useQuery({
    queryKey: ['playerComparison', discordIds],
    queryFn: async () => {
      if (discordIds.length === 0) return {};

      const client = getClient();
      const results: { [key: string]: PlayerSnapshot[] } = {};

      for (const discordId of discordIds) {
        const { data, error } = await client
          .from(TABLE_PLAYER_SNAPSHOTS)
          .select('*')
          .eq('discord_id', discordId)
          .order('snapshot_date', { ascending: false });

        if (error) throw error;
        results[discordId] = (data || []) as PlayerSnapshot[];
      }

      return results;
    },
    enabled: discordIds.length > 0,
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

// Fetch weekly statistics (pre-aggregated data for trends page)
export function useWeeklyStatistics() {
  return useQuery({
    queryKey: ['weeklyStatistics'],
    queryFn: async () => {
      const client = getClient();
      
      const { data, error } = await client
        .from(TABLE_WEEKLY_STATISTICS)
        .select('*')
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return (data || []) as WeeklyStatistics[];
    },
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}
