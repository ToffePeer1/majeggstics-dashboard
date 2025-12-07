-- ============================================================================
-- Snapshot Save Metadata Table
-- ============================================================================
--
-- PURPOSE:
-- Tracks snapshot save decisions, timing, and pending synchronization state.
-- This is a single-row table that stores the state machine for snapshot logic.
--
-- KEY FEATURES:
-- - Tracks when snapshots were last saved
-- - Stores decision results for debugging
-- - Manages "pending sync" state (when 99% of players are synced)
-- - Tracks email alerts to prevent spam
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS snapshot_save_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensures single row
  
  -- Last successful snapshot save
  last_saved_at TIMESTAMPTZ,
  
  -- Last decision evaluation (runs every 15 minutes via cron)
  last_decision_at TIMESTAMPTZ DEFAULT NOW(),
  last_decision_result JSONB, -- Full decision object for debugging
  
  -- Email tracking
  last_email_sent_at TIMESTAMPTZ,
  last_email_type TEXT, -- 'snapshot_saved', 'partial_sync', 'week_no_update'
  
  -- Pending sync state (for 99% rule)
  -- When 99% of players are synced but not 100%, we store the data here
  -- and wait for the next cron run (15 minutes) to see if the missing 1% updates
  pending_sync_data JSONB, -- Stores full player data array
  pending_sync_first_attempt TIMESTAMPTZ,
  pending_sync_attempt_count INTEGER DEFAULT 0,
  pending_sync_metadata JSONB, -- Stores decision metadata (sync %, missing players, etc.)
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial row
INSERT INTO snapshot_save_metadata (id) 
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_snapshot_save_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_snapshot_save_metadata_timestamp ON snapshot_save_metadata;
CREATE TRIGGER update_snapshot_save_metadata_timestamp
  BEFORE UPDATE ON snapshot_save_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_snapshot_save_metadata_timestamp();

-- ============================================================================
-- NO RLS - Service role access only
-- ============================================================================

REVOKE ALL ON snapshot_save_metadata FROM anon, authenticated;

-- ============================================================================
-- Helper Queries
-- ============================================================================
--
-- View current state:
--   SELECT * FROM snapshot_save_metadata;
--
-- Check if pending sync exists:
--   SELECT 
--     pending_sync_data IS NOT NULL as has_pending,
--     pending_sync_attempt_count,
--     pending_sync_first_attempt,
--     NOW() - pending_sync_first_attempt as pending_duration
--   FROM snapshot_save_metadata;
--
-- View last decision:
--   SELECT 
--     last_decision_at,
--     last_decision_result->>'shouldSave' as should_save,
--     last_decision_result->>'syncPercentage' as sync_pct,
--     last_decision_result->>'reason' as reason
--   FROM snapshot_save_metadata;
--
-- Clear pending sync (manual reset):
--   UPDATE snapshot_save_metadata SET
--     pending_sync_data = NULL,
--     pending_sync_first_attempt = NULL,
--     pending_sync_attempt_count = 0,
--     pending_sync_metadata = NULL;
--
-- Check time since last save:
--   SELECT 
--     last_saved_at,
--     NOW() - last_saved_at as time_since_save,
--     EXTRACT(EPOCH FROM (NOW() - last_saved_at)) / 3600 as hours_since_save
--   FROM snapshot_save_metadata;
--
-- ============================================================================
