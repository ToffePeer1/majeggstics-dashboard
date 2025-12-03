-- ============================================================================
-- Leaderboard Cache Tables
-- ============================================================================
--
-- These tables store cached leaderboard data for fast access.
-- The cache is managed by the get-leaderboard Edge Function.
--
-- WHY NO RLS:
-- ===========
-- These tables are only accessed by the Edge Function using the service role
-- key, which bypasses RLS. The Edge Function handles access control by:
-- 1. Validating the user's JWT
-- 2. Filtering out num_prestiges for non-admin users
--
-- This is more efficient than RLS for this use case because:
-- - All users see the same base data (just different columns)
-- - The Edge Function already needs to check freshness and possibly refresh
-- - Avoids duplicate access control logic
--
-- ============================================================================

-- ============================================================================
-- Table: leaderboard_cache
-- ============================================================================
-- Stores the current/live player data for the leaderboard.
-- This is separate from player_snapshots which stores historical data.

CREATE TABLE IF NOT EXISTS leaderboard_cache (
  discord_id TEXT PRIMARY KEY,
  ign TEXT NOT NULL,
  display_name TEXT,
  discord_name TEXT NOT NULL,
  eb NUMERIC NOT NULL,
  se NUMERIC NOT NULL,
  pe INTEGER NOT NULL,
  te INTEGER,
  num_prestiges INTEGER,
  farmer_role TEXT,
  grade TEXT NOT NULL,
  is_guest BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_eb ON leaderboard_cache(eb DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_se ON leaderboard_cache(se DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_pe ON leaderboard_cache(pe DESC);

-- ============================================================================
-- Table: leaderboard_cache_metadata
-- ============================================================================
-- Single-row table tracking when the cache was last updated.
-- Used by the Edge Function to determine if data needs refreshing.

CREATE TABLE IF NOT EXISTS leaderboard_cache_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensures single row
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial row if not exists
INSERT INTO leaderboard_cache_metadata (id, last_updated)
VALUES (1, NOW() - INTERVAL '1 day') -- Start with stale data to trigger initial fetch
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NO RLS on these tables - accessed only via service role in Edge Function
-- ============================================================================
-- The Edge Function handles access control, so we don't need RLS here.
-- If you want to add RLS for defense-in-depth, you could add:
--
-- ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Service role only" ON leaderboard_cache
--   USING (false); -- Blocks all access except service role
--
-- But this is redundant since the anon key can't access these tables anyway
-- when we don't grant any permissions.

-- Grant no permissions to anon or authenticated roles
-- Only service_role can access these tables
REVOKE ALL ON leaderboard_cache FROM anon, authenticated;
REVOKE ALL ON leaderboard_cache_metadata FROM anon, authenticated;

-- ============================================================================
-- Documentation
-- ============================================================================
--
-- How the caching system works:
--
-- 1. User requests leaderboard via get-leaderboard Edge Function
-- 2. Edge Function checks leaderboard_cache_metadata.last_updated
-- 3. If < 15 minutes old: return data from leaderboard_cache
-- 4. If >= 15 minutes old: fetch from BOT_API, update both tables, return data
-- 5. Edge Function filters out num_prestiges for non-admin users
--
-- To manually invalidate the cache (force refresh on next request):
--   UPDATE leaderboard_cache_metadata SET last_updated = NOW() - INTERVAL '1 hour';
--
-- To check cache status:
--   SELECT last_updated, 
--          NOW() - last_updated AS age,
--          (NOW() - last_updated) < INTERVAL '15 minutes' AS is_fresh
--   FROM leaderboard_cache_metadata;
--
-- ============================================================================
