// ============================================================================
// Snapshot Timing Configuration
// ============================================================================
// Centralized configuration for snapshot decision logic timing parameters

/**
 * Snapshot timing and synchronization thresholds
 */
export const SNAPSHOT_CONFIG = {
  /**
   * Synchronization window: Players must update within this time of each other
   * Default: 1 hour 5 minutes (65 minutes)
   */
  SYNC_WINDOW_HOURS: 1 + (5 / 60),
  
  /**
   * Cooldown period: Minimum time between snapshots
   * Default: 1.5 hours (90 minutes)
   */
  COOLDOWN_HOURS: 1.5,
  
  /**
   * Partial sync threshold: Percentage of players needed to consider saving
   * If >= this percentage are synced, we retry once before saving
   * Default: 99.0%
   */
  PARTIAL_SYNC_THRESHOLD: 99.0,
  
  /**
   * Number of retry attempts for partial sync before saving anyway
   * Default: 2 (first detection + 1 retry)
   */
  PARTIAL_SYNC_RETRY_ATTEMPTS: 2,
  
  /**
   * Cron job interval: How often the refresh-leaderboard-cron runs
   * Default: 15 minutes (900000 ms)
   */
  CRON_INTERVAL_MINUTES: 15,
  
  /**
   * Cache freshness duration: How long leaderboard cache is considered fresh
   * Default: 15 minutes (matches cron interval)
   */
  CACHE_DURATION_MINUTES: 15,
  
  /**
   * Alert threshold: Days without snapshot before sending alert email
   * Default: 7 days (168 hours)
   */
  ALERT_THRESHOLD_DAYS: 7,
  
  /**
   * Alert cooldown: Hours between alert emails (prevent spam)
   * Default: 2 hours
   */
  ALERT_COOLDOWN_HOURS: 2,
  
  /**
   * Pending sync staleness: Hours after which pending sync data is cleared
   * Default: 2 hours (prevents indefinite pending state)
   */
  PENDING_SYNC_STALE_HOURS: 2,
} as const;

/**
 * Derived constants (calculated from above)
 */
export const DERIVED_CONSTANTS = {
  SYNC_WINDOW_MS: SNAPSHOT_CONFIG.SYNC_WINDOW_HOURS * 60 * 60 * 1000,
  COOLDOWN_MS: SNAPSHOT_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000,
  CRON_INTERVAL_MS: SNAPSHOT_CONFIG.CRON_INTERVAL_MINUTES * 60 * 1000,
  CACHE_DURATION_MS: SNAPSHOT_CONFIG.CACHE_DURATION_MINUTES * 60 * 1000,
  ALERT_THRESHOLD_MS: SNAPSHOT_CONFIG.ALERT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  ALERT_COOLDOWN_MS: SNAPSHOT_CONFIG.ALERT_COOLDOWN_HOURS * 60 * 60 * 1000,
  PENDING_SYNC_STALE_MS: SNAPSHOT_CONFIG.PENDING_SYNC_STALE_HOURS * 60 * 60 * 1000,
} as const;
