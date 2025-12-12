// Custom hooks for data fetching using React Query

import { useQuery } from '@tanstack/react-query';
import { TABLE_PLAYER_SNAPSHOTS, TABLE_SNAPSHOT_METADATA, TABLE_WEEKLY_STATISTICS, VIEW_UNIQUE_PLAYERS_LATEST, CACHE_TTL, ENV, EDGE_FUNCTIONS } from '@/config/constants';
import type { PlayerSnapshot, SnapshotMetadata, PlayerListItem, WeeklyStatistics } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { preprocessPlayerData } from '@/utils/dataProcessing';

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
  const { getAuthenticatedClient, isAuthenticated, jwt } = useAuth();

  return useQuery({
    // Include jwt in queryKey to invalidate cache when auth changes
    queryKey: ['playerSnapshots', discordId, jwt],
    queryFn: async () => {
      if (!discordId) return [];

      const client = getAuthenticatedClient();
      if (!client) throw new Error('Not authenticated');
      
      // The RLS policy will automatically filter to only show this user's data
      // We include the discord_id filter here for clarity and performance
      const { data, error } = await client
        .from(TABLE_PLAYER_SNAPSHOTS)
        .select('*')
        .eq('discord_id', discordId)
        .order('snapshot_date', { ascending: false });
      
      if (error) throw error;
      const result = (data || []) as PlayerSnapshot[];
      // Preprocess data: normalize grade and fill missing farmer roles
      return result.map(snapshot => preprocessPlayerData(snapshot));
    },
    // Only run when authenticated and discordId is provided
    enabled: isAuthenticated && !!discordId,
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

// Fetch player list for autocomplete using materialized view (admin only - requires proper RLS)
export function usePlayerList() {
  const { getAuthenticatedClient, isAuthenticated, jwt } = useAuth();

  return useQuery({
    // Include jwt in queryKey to invalidate cache when auth changes
    queryKey: ['playerList', jwt],
    queryFn: async () => {
      const client = getAuthenticatedClient();
      if (!client) throw new Error('Not authenticated');
      
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
    // Only run when authenticated
    enabled: isAuthenticated,
    staleTime: CACHE_TTL.PLAYER_LIST,
  });
}

// Fetch latest snapshot date
export function useLatestSnapshotDate() {
  const { getAuthenticatedClient, isAuthenticated, jwt } = useAuth();

  return useQuery({
    queryKey: ['latestSnapshotDate', jwt],
    queryFn: async () => {
      const client = getAuthenticatedClient();
      if (!client) throw new Error('Not authenticated');
      
      const { data, error } = await client
        .from(TABLE_SNAPSHOT_METADATA)
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data?.snapshot_date || null;
    },
    enabled: isAuthenticated,
    staleTime: CACHE_TTL.LATEST_SNAPSHOT,
  });
}

// Fetch all snapshot metadata
export function useSnapshotMetadata() {
  const { getAuthenticatedClient, isAuthenticated, jwt } = useAuth();

  return useQuery({
    queryKey: ['snapshotMetadata', jwt],
    queryFn: async () => {
      const client = getAuthenticatedClient();
      if (!client) throw new Error('Not authenticated');
      
      const { data, error } = await client
        .from(TABLE_SNAPSHOT_METADATA)
        .select('*')
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return (data || []) as SnapshotMetadata[];
    },
    enabled: isAuthenticated,
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

// Fetch all player snapshots (for trends - admin only)
export function useAllPlayerSnapshots() {
  const { getAuthenticatedClient, isAuthenticated, jwt } = useAuth();

  return useQuery({
    queryKey: ['allPlayerSnapshots', jwt],
    queryFn: async () => {
      const client = getAuthenticatedClient();
      if (!client) throw new Error('Not authenticated');
      
      const { data, error } = await client
        .from(TABLE_PLAYER_SNAPSHOTS)
        .select('snapshot_date, eb, se, pe, num_prestiges, grade')
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      const result = (data || []) as PlayerSnapshot[];
      // Preprocess data: normalize grade and fill missing farmer roles
      return result.map(snapshot => preprocessPlayerData(snapshot));
    },
    enabled: isAuthenticated,
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

// Fetch multiple players' data for comparison (admin only)
export function usePlayerComparison(discordIds: string[]) {
  const { getAuthenticatedClient, isAuthenticated, jwt } = useAuth();

  return useQuery({
    queryKey: ['playerComparison', discordIds, jwt],
    queryFn: async () => {
      if (discordIds.length === 0) return {};

      const client = getAuthenticatedClient();
      if (!client) throw new Error('Not authenticated');
      
      const results: { [key: string]: PlayerSnapshot[] } = {};

      for (const discordId of discordIds) {
        const { data, error } = await client
          .from(TABLE_PLAYER_SNAPSHOTS)
          .select('*')
          .eq('discord_id', discordId)
          .order('snapshot_date', { ascending: false });

        if (error) throw error;
        // Preprocess data: normalize grade and fill missing farmer roles
        results[discordId] = ((data || []) as PlayerSnapshot[]).map(snapshot => preprocessPlayerData(snapshot));
      }

      return results;
    },
    enabled: isAuthenticated && discordIds.length > 0,
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

// Fetch weekly statistics (pre-aggregated data for trends page)
export function useWeeklyStatistics() {
  const { getAuthenticatedClient, isAuthenticated, jwt } = useAuth();

  return useQuery({
    queryKey: ['weeklyStatistics', jwt],
    queryFn: async () => {
      const client = getAuthenticatedClient();
      if (!client) throw new Error('Not authenticated');
      
      const { data, error } = await client
        .from(TABLE_WEEKLY_STATISTICS)
        .select('*')
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return (data || []).map(({ grade_aaa, grade_aa, grade_a, grade_b, grade_c, ...entry }) => ({
        ...entry,
        grade_AAA: grade_aaa,
        grade_AA: grade_aa,
        grade_A: grade_a,
        grade_B: grade_b,
        grade_C: grade_c,
      })) as WeeklyStatistics[];
    },
    enabled: isAuthenticated,
    staleTime: CACHE_TTL.PLAYER_DATA,
  });
}

/**
 * Cached Leaderboard Response from Edge Function
 */
export interface CachedLeaderboardResponse {
  players: Array<{
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
  }>;
  lastUpdated: string;
  playerCount: number;
  fromCache: boolean;
}

/**
 * Fetch cached leaderboard data from the Edge Function
 * 
 * This hook fetches current/live player data with automatic caching:
 * - If data is fresh (< 15 minutes old): returns cached data instantly
 * - If data is stale (>= 15 minutes old): fetches fresh data from bot API
 * 
 * The Edge Function handles:
 * - JWT validation
 * - Access level filtering (non-admins don't see num_prestiges)
 * - Cache management
 */
export function useCachedLeaderboard() {
  const { isAuthenticated, jwt } = useAuth();

  return useQuery({
    queryKey: ['cachedLeaderboard', jwt],
    queryFn: async () => {
      if (!jwt) throw new Error('Not authenticated');

      const edgeFunctionUrl = `${ENV.SUPABASE_URL}${EDGE_FUNCTIONS.GET_LEADERBOARD}`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch leaderboard: ${response.status}`);
      }

      const data: CachedLeaderboardResponse = await response.json();
      for (const player of data.players) {
        // Capitalize grade for consistency
        player.grade = player.grade.toUpperCase();
      }
      return data;
    },
    enabled: isAuthenticated && !!jwt,
    staleTime: CACHE_TTL.LATEST_SNAPSHOT,
    // Refetch every 5 minutes to check for updates
    refetchInterval: 5 * 60 * 1000,
  });
}
