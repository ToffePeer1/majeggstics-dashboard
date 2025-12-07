-- ============================================================================
-- Excluded Players Table
-- ============================================================================
--
-- PURPOSE:
-- Tracks players whose save data is corrupted (updatedAt field not updating).
-- These players are excluded from snapshot synchronization checks to prevent
-- false negatives in the "all players updated together" validation.
--
-- USAGE:
-- - Add players manually via SQL when their save data breaks
-- - Remove players when their issue is resolved
-- - Query this table in edge functions to filter data
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS excluded_players (
  discord_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  excluded_at TIMESTAMPTZ DEFAULT NOW(),
  excluded_by TEXT,
  notes TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_excluded_players_excluded_at 
ON excluded_players(excluded_at DESC);

-- Insert initial known problematic players
-- (These are the players from the GAS script with broken updatedAt fields)
INSERT INTO excluded_players (discord_id, reason, excluded_by, notes) VALUES
  ('338455842154217472', 'updatedAt field not updating', 'initial_migration', 'Migrated from GAS excluded list'),
  ('1331406009993789562', 'updatedAt field not updating', 'initial_migration', 'Migrated from GAS excluded list'),
  ('635739783079133184', 'updatedAt field not updating', 'initial_migration', 'Migrated from GAS excluded list'),
  ('220331481652789248', 'updatedAt field not updating', 'initial_migration', 'Migrated from GAS excluded list')
ON CONFLICT (discord_id) DO NOTHING;

-- ============================================================================
-- NO RLS - Service role access only
-- ============================================================================
-- This table is only accessed by edge functions using the service role key.
-- Users don't need direct access to this table.

REVOKE ALL ON excluded_players FROM anon, authenticated;

-- ============================================================================
-- Helper Queries
-- ============================================================================
--
-- View all excluded players:
--   SELECT * FROM excluded_players ORDER BY excluded_at DESC;
--
-- Add a new excluded player:
--   INSERT INTO excluded_players (discord_id, reason, excluded_by, notes)
--   VALUES ('123456789', 'Save data corrupted', 'admin_name', 'Additional context');
--
-- Remove a player (their issue was fixed):
--   DELETE FROM excluded_players WHERE discord_id = '123456789';
--
-- Count excluded players:
--   SELECT COUNT(*) FROM excluded_players;
--
-- ============================================================================
