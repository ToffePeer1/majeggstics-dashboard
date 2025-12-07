// ============================================================================
// Shared Type Definitions
// ============================================================================
// Common types used across edge functions for snapshot management

/**
 * Player data from the Bot API
 */
export interface BotApiPlayer {
  ID: string; // discord_id
  IGN: string;
  discordName: string;
  displayName?: string | null;
  farmerRole?: string | null;
  grade: string;
  active?: boolean;
  isGuest?: boolean;
  EB: number;
  SE: number;
  PE: number;
  TE?: number | null;
  numPrestiges?: number | null;
  updatedAt: string; // ISO timestamp
  gains?: {
    saturday?: number | null;
    eggDay?: Array<{
      year: number;
      eggDayStartSE?: number | null;
      eggDayStartPE?: number | null;
      eggDayStartEB?: number | null;
      eggDayStartRole?: string | null;
      eggDayStartPrestiges?: number | null;
      eggDayEndSE?: number | null;
      eggDayEndPE?: number | null;
      eggDayEndEB?: number | null;
      eggDayEndRole?: string | null;
      eggDayEndPrestiges?: number | null;
    }>;
  };
  maxMysticalEggs?: number | null;
}

/**
 * Leaderboard cache entry (matches database schema)
 */
export interface LeaderboardCacheEntry {
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

/**
 * Snapshot decision result
 */
export interface SnapshotDecision {
  shouldSave: boolean;
  
  // Sync statistics
  syncPercentage: number; // e.g., 99.5
  playersInSyncWindow: number;
  totalNonExcludedPlayers: number;
  totalPlayersReceived: number;
  excludedPlayerCount: number;
  
  // Timing
  lowestUpdatedAt: Date | null;
  timeSinceLowestUpdateHours: number;
  hoursSinceLastSave: number;
  
  // Decision metadata
  reason: string;
  isPendingSync: boolean; // true if waiting for 15min retry
  pendingAttemptCount: number;
  
  // Missing players (for partial sync warnings)
  missingPlayers?: Array<{
    discord_id: string;
    ign: string;
    updatedAt: string;
    timeDifferenceHours: number;
  }>;
}

/**
 * Pending sync data stored in database
 */
export interface PendingSyncData {
  players: BotApiPlayer[];
  timestamp: string;
  syncPercentage: number;
  attemptCount: number;
  missingPlayers: Array<{
    discord_id: string;
    ign: string;
    updatedAt: string;
  }>;
}

/**
 * Email template data
 */
export interface EmailData {
  type: 'snapshot_saved' | 'partial_sync' | 'week_no_update' | 'sync_failed';
  recipient: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  metadata?: Record<string, unknown>;
  relatedSnapshotDate?: string;
}

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  responseData?: unknown;
}

/**
 * Snapshot save metadata from database
 */
export interface SnapshotSaveMetadata {
  id: number;
  last_saved_at: string | null;
  last_decision_at: string;
  last_decision_result: SnapshotDecision | null;
  last_email_sent_at: string | null;
  last_email_type: string | null;
  pending_sync_data: PendingSyncData | null;
  pending_sync_first_attempt: string | null;
  pending_sync_attempt_count: number;
  pending_sync_metadata: Record<string, unknown> | null;
  updated_at: string;
}

/**
 * Update player data request payload
 */
export interface UpdatePlayerDataRequest {
  // Internal call mode
  internalCall?: boolean;
  players?: BotApiPlayer[];
  snapshotDate?: string;
  
  // Force update flag (for dry-run testing)
  forceUpdate?: boolean;
  dryRun?: boolean;
  
  // Email options
  sendEmail?: boolean;
  emailContext?: {
    syncPercentage: number;
    missingPlayers?: Array<{
      discord_id: string;
      ign: string;
      updatedAt: string;
    }>;
    isPartialSync?: boolean;
  };
}

/**
 * Update player data response
 */
export interface UpdatePlayerDataResponse {
  success: boolean;
  snapshotDate: string;
  playerCount: number;
  dryRun?: boolean;
  snapshots: {
    inserted: number;
    errors: number;
  };
  eggdayGains: {
    inserted: number;
    errors: number;
  };
  errors: string[];
  refreshMaterializedViewsResponse: string;
  emailSent?: boolean;
  emailError?: string;
}
