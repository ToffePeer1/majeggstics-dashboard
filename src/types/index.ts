// Type definitions for the application

import type { Session } from '@supabase/supabase-js';

export interface PlayerSnapshot {
  id?: number;
  discord_id: string;
  ign: string;
  display_name: string;
  discord_name: string;
  eb: number;
  se: number;
  pe: number;
  te: number;
  num_prestiges: number;
  farmer_role: string;
  grade: string;
  is_guest: boolean;
  active: boolean;
  snapshot_date: string;
  imported_at?: string;
}

export interface SnapshotMetadata {
  id?: number;
  snapshot_date: string;
  record_count: number;
  imported_at: string;
}

/**
 * Discord user info returned from the Edge Function
 */
export interface DiscordUser {
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

/**
 * Response from the discord-auth Edge Function
 */
export interface DiscordAuthResponse {
  jwt: string;
  user: DiscordUser;
  access_level: 'user' | 'admin';
  expires_at: number;
}

/**
 * Error response from the Edge Function
 */
export interface AuthErrorResponse {
  error: string;
  details?: string;
  message?: string; // User-facing error message (e.g., for access denied)
}

/**
 * Decoded JWT payload (for reference - actual verification happens on server)
 * SECURITY NOTE: Never trust decoded JWT data without server-side verification
 */
export interface JWTPayload {
  sub: string;
  aud: string;
  role: string;
  iat: number;
  exp: number;
  discord_id: string;
  access_level: 'user' | 'admin';
  user_metadata?: {
    discord_username?: string;
    discord_global_name?: string | null;
    discord_avatar?: string | null;
  };
}

/**
 * Auth state for the application
 * Uses custom Discord JWT instead of Supabase's built-in OAuth
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: DiscordUser | null;
  session: Session | null;
  accessLevel: 'admin' | 'user' | null;
  discordId: string | null;
  isLoading: boolean;
  jwt: string | null;
  expiresAt: number | null;
}

export interface PlayerListItem {
  label: string;
  discordId: string;
}

export type AccessLevel = 'admin' | 'user';

export interface ChartData {
  snapshot_date: Date;
  [key: string]: number | Date | string | boolean | null | undefined;
}

export interface AggregateStats {
  eb_mean: number;
  eb_median: number;
  eb_max: number;
  se_mean: number;
  se_median: number;
  se_max: number;
  pe_mean: number;
  pe_median: number;
  pe_max: number;
  num_prestiges_mean: number;
  num_prestiges_sum: number;
}

export interface GradeDistribution {
  snapshot_date: string;
  AAA: number;
  AA: number;
  A: number;
  B: number;
  C: number;
}

export interface ComparisonData {
  [playerName: string]: PlayerSnapshot[];
}

export interface GrowthData {
  player: string;
  startingValue: number;
  currentValue: number;
  absoluteGrowth: number;
  growthPercentage: number;
  weeksTracked: number;
}

export interface WeeklyStatistics {
  snapshot_date: string;
  player_count: number;
  active_player_count: number;
  guest_count: number;
  grade_AAA: number;
  grade_AA: number;
  grade_A: number;
  grade_B: number;
  grade_C: number;
  avg_eb: number;
  median_eb: number;
  max_eb: number;
  total_eb: number;
  avg_se: number;
  median_se: number;
  max_se: number;
  total_se: number;
  avg_pe: number;
  median_pe: number;
  max_pe: number;
  total_pe: number;
  avg_te: number;
  median_te: number;
  max_te: number;
  total_te: number;
  avg_prestiges: number;
  median_prestiges: number;
  max_prestiges: number;
  total_prestiges: number;
}
