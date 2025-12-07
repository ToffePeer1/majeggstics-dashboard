// ============================================================================
// Snapshot Decision Logic
// ============================================================================
// Ported from Google Apps Script shouldSaveData() function
// Determines whether player data should be saved as a snapshot

import type { 
  BotApiPlayer, 
  SnapshotDecision, 
  SnapshotSaveMetadata,
  PendingSyncData 
} from './types.ts';

/**
 * Configuration constants
 */
const SYNC_WINDOW_HOURS = 1 + (5 / 60); // 1 hour, 5 minutes (65 minutes)
const COOLDOWN_HOURS = 1.5; // Minimum time between snapshots
const PARTIAL_SYNC_THRESHOLD = 99.0; // Percentage threshold for partial sync
const PARTIAL_SYNC_RETRY_ATTEMPTS = 2; // Number of attempts before saving anyway

/**
 * Determines if we should save player data as a snapshot.
 * 
 * This function implements a multi-part check:
 * 1. Synchronization check: Most players updated within 1 hour of each other
 * 2. Recency check: Update happened within last 65 minutes
 * 3. Cooldown check: At least 1.5 hours since last save
 * 4. Partial sync handling: If 99%+ synced, retry once before saving
 * 
 * @param players - Array of player data from bot API
 * @param excludedIds - Discord IDs to exclude from sync check
 * @param metadata - Current snapshot save metadata from database
 * @returns Decision object with shouldSave flag and detailed reasoning
 */
export async function shouldSaveSnapshot(
  players: BotApiPlayer[],
  excludedIds: string[],
  metadata: SnapshotSaveMetadata | null
): Promise<SnapshotDecision> {
  const totalPlayersReceived = players.length;
  
  // Filter out guest users and excluded players
  const filteredPlayers = players.filter(
    player => !player.isGuest && !excludedIds.includes(player.ID)
  );
  
  const totalNonExcludedPlayers = filteredPlayers.length;
  const excludedPlayerCount = totalPlayersReceived - totalNonExcludedPlayers;
  
  // Early return if no valid users
  if (totalNonExcludedPlayers === 0) {
    return {
      shouldSave: false,
      syncPercentage: 0,
      playersInSyncWindow: 0,
      totalNonExcludedPlayers: 0,
      totalPlayersReceived,
      excludedPlayerCount,
      lowestUpdatedAt: null,
      timeSinceLowestUpdateHours: 0,
      hoursSinceLastSave: Infinity,
      reason: "No non-guest, non-excluded players in response",
      isPendingSync: false,
      pendingAttemptCount: 0
    };
  }
  
  // ============================================================
  // STEP 1: Find the oldest 'updatedAt' timestamp
  // ============================================================
  const lowestUpdatedAtTimestamp = Math.min(
    ...filteredPlayers.map(player => new Date(player.updatedAt).getTime())
  );
  const lowestUpdatedAt = new Date(lowestUpdatedAtTimestamp);
  
  // ============================================================
  // STEP 2: Count players updated within 1 hour of the oldest
  // ============================================================
  const ONE_HOUR_MS = 3600000;
  let playersInSyncWindow = 0;
  const missingPlayers: Array<{
    discord_id: string;
    ign: string;
    updatedAt: string;
    timeDifferenceHours: number;
  }> = [];
  
  for (const player of filteredPlayers) {
    const updatedAt = new Date(player.updatedAt);
    const timeDifference = updatedAt.getTime() - lowestUpdatedAt.getTime();
    
    if (timeDifference < ONE_HOUR_MS) {
      playersInSyncWindow++;
    } else {
      // Track players not in sync window
      missingPlayers.push({
        discord_id: player.ID,
        ign: player.IGN,
        updatedAt: player.updatedAt,
        timeDifferenceHours: timeDifference / 3600000
      });
    }
  }
  
  // Calculate sync percentage
  const syncPercentage = (playersInSyncWindow / totalNonExcludedPlayers) * 100;
  
  // ============================================================
  // STEP 3: Calculate time since the oldest update
  // ============================================================
  const now = Date.now();
  const timeSinceLowestUpdateHours = (now - lowestUpdatedAt.getTime()) / 3600000;
  
  // ============================================================
  // STEP 4: Check cooldown period
  // ============================================================
  const lastSaved = metadata?.last_saved_at;
  const hoursSinceLastSave = lastSaved 
    ? (now - new Date(lastSaved).getTime()) / 3600000
    : Infinity;
  
  // ============================================================
  // STEP 5: Check for pending sync state
  // ============================================================
  const hasPendingSync = metadata?.pending_sync_data !== null;
  const pendingAttemptCount = metadata?.pending_sync_attempt_count || 0;
  
  // If we have pending sync data, check if it's still relevant
  if (hasPendingSync) {
    const pendingFirstAttempt = metadata?.pending_sync_first_attempt;
    const hoursSincePending = pendingFirstAttempt
      ? (now - new Date(pendingFirstAttempt).getTime()) / 3600000
      : 0;
    
    // Clear stale pending sync (older than 2 hours)
    if (hoursSincePending > 2) {
      console.log('Clearing stale pending sync data');
      // Note: Actual clearing happens in the calling function
      // We just proceed as if there's no pending sync
    } else if (syncPercentage >= 100) {
      // If we now have 100% sync, save immediately regardless of pending state
      return {
        shouldSave: true,
        syncPercentage,
        playersInSyncWindow,
        totalNonExcludedPlayers,
        totalPlayersReceived,
        excludedPlayerCount,
        lowestUpdatedAt,
        timeSinceLowestUpdateHours,
        hoursSinceLastSave,
        reason: "100% sync achieved after pending sync, saving immediately",
        isPendingSync: false,
        pendingAttemptCount: pendingAttemptCount + 1,
        missingPlayers: []
      };
    } else if (syncPercentage >= PARTIAL_SYNC_THRESHOLD && pendingAttemptCount >= PARTIAL_SYNC_RETRY_ATTEMPTS - 1) {
      // Second attempt with partial sync - save anyway with warning
      return {
        shouldSave: true,
        syncPercentage,
        playersInSyncWindow,
        totalNonExcludedPlayers,
        totalPlayersReceived,
        excludedPlayerCount,
        lowestUpdatedAt,
        timeSinceLowestUpdateHours,
        hoursSinceLastSave,
        reason: `Partial sync after ${pendingAttemptCount + 1} attempts (${syncPercentage.toFixed(2)}%), saving with warning`,
        isPendingSync: false,
        pendingAttemptCount: pendingAttemptCount + 1,
        missingPlayers
      };
    }
  }
  
  // ============================================================
  // STEP 6: Evaluate all conditions
  // ============================================================
  const updateIsRecent = timeSinceLowestUpdateHours < SYNC_WINDOW_HOURS;
  const cooldownPassed = hoursSinceLastSave > COOLDOWN_HOURS;
  const fullySynced = syncPercentage >= 100;
  const partiallySynced = syncPercentage >= PARTIAL_SYNC_THRESHOLD;
  
  // Check 1: Full sync (100%)
  if (fullySynced && updateIsRecent && cooldownPassed) {
    return {
      shouldSave: true,
      syncPercentage,
      playersInSyncWindow,
      totalNonExcludedPlayers,
      totalPlayersReceived,
      excludedPlayerCount,
      lowestUpdatedAt,
      timeSinceLowestUpdateHours,
      hoursSinceLastSave,
      reason: "All conditions met: 100% sync, recent update, cooldown passed",
      isPendingSync: false,
      pendingAttemptCount: 0,
      missingPlayers: []
    };
  }
  
  // Check 2: Partial sync (99%+) - first detection
  if (partiallySynced && updateIsRecent && cooldownPassed && !hasPendingSync) {
    return {
      shouldSave: false,
      syncPercentage,
      playersInSyncWindow,
      totalNonExcludedPlayers,
      totalPlayersReceived,
      excludedPlayerCount,
      lowestUpdatedAt,
      timeSinceLowestUpdateHours,
      hoursSinceLastSave,
      reason: `Partial sync detected (${syncPercentage.toFixed(2)}%), storing for retry in 15 minutes`,
      isPendingSync: true,
      pendingAttemptCount: 1,
      missingPlayers
    };
  }
  
  // ============================================================
  // STEP 7: Determine reason for not saving
  // ============================================================
  let reason = "";
  if (!updateIsRecent) {
    reason = `Update too old (${timeSinceLowestUpdateHours.toFixed(2)} hours ago, threshold: ${SYNC_WINDOW_HOURS})`;
  } else if (!cooldownPassed) {
    reason = `Cooldown not passed (saved ${hoursSinceLastSave.toFixed(2)} hours ago, threshold: ${COOLDOWN_HOURS})`;
  } else if (!partiallySynced) {
    reason = `Insufficient sync (${syncPercentage.toFixed(2)}% of ${totalNonExcludedPlayers} players, threshold: ${PARTIAL_SYNC_THRESHOLD}%)`;
  } else {
    reason = "Unknown condition preventing save";
  }
  
  return {
    shouldSave: false,
    syncPercentage,
    playersInSyncWindow,
    totalNonExcludedPlayers,
    totalPlayersReceived,
    excludedPlayerCount,
    lowestUpdatedAt,
    timeSinceLowestUpdateHours,
    hoursSinceLastSave,
    reason,
    isPendingSync: false,
    pendingAttemptCount,
    missingPlayers
  };
}

/**
 * Check if an alert email should be sent (7+ days without snapshot)
 * 
 * @param metadata - Current snapshot save metadata
 * @returns true if alert should be sent
 */
export function shouldSendWeekNoUpdateAlert(
  metadata: SnapshotSaveMetadata | null
): boolean {
  if (!metadata?.last_saved_at) {
    return false; // Never saved, don't alert yet
  }
  
  const now = Date.now();
  const lastSaved = new Date(metadata.last_saved_at).getTime();
  const hoursSinceLastSave = (now - lastSaved) / 3600000;
  
  // Check if 7+ days (168 hours) since last save
  if (hoursSinceLastSave < 24 * 7 + 1) {
    return false;
  }
  
  // Check cooldown on alert emails (don't spam every 15 minutes)
  const lastEmailSent = metadata.last_email_sent_at;
  const lastEmailType = metadata.last_email_type;
  
  if (lastEmailSent && lastEmailType === 'week_no_update') {
    const hoursSinceEmail = (now - new Date(lastEmailSent).getTime()) / 3600000;
    // Only send alert if 2+ hours since last alert
    return hoursSinceEmail > 2;
  }
  
  return true;
}

/**
 * Create pending sync data object for storage
 */
export function createPendingSyncData(
  players: BotApiPlayer[],
  decision: SnapshotDecision
): PendingSyncData {
  return {
    players,
    timestamp: new Date().toISOString(),
    syncPercentage: decision.syncPercentage,
    attemptCount: decision.pendingAttemptCount,
    missingPlayers: decision.missingPlayers?.map(p => ({
      discord_id: p.discord_id,
      ign: p.ign,
      updatedAt: p.updatedAt
    })) || []
  };
}
