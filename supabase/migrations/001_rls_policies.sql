-- ============================================================================
-- Row Level Security (RLS) Policies for Discord OAuth with Custom JWT
-- ============================================================================
-- 
-- SECURITY MODEL:
-- ================
-- 1. Users authenticate via Discord OAuth
-- 2. Our Edge Function creates JWTs signed with JWT_SECRET
-- 3. JWTs contain a 'discord_id' claim identifying the user
-- 4. RLS policies use this claim to filter data access
-- 5. Users can only see rows where discord_id matches their JWT claim
--
-- WHY THIS IS SECURE:
-- - JWTs are cryptographically signed
-- - Only the Edge Function has the signing key
-- - Users cannot forge or modify JWTs
-- - Supabase validates signatures on every request
-- - Modified JWTs fail validation and are rejected
--
-- ============================================================================

-- Enable RLS on player_snapshots table
ALTER TABLE player_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean migrations)
DROP POLICY IF EXISTS "Users can view their own snapshots" ON player_snapshots;
DROP POLICY IF EXISTS "Admins can view all snapshots" ON player_snapshots;

-- ============================================================================
-- Policy: Users can view their own snapshots
-- ============================================================================
-- This policy allows authenticated users to SELECT rows where the discord_id
-- column matches the discord_id claim in their JWT.
--
-- The function auth.jwt() returns the decoded JWT payload.
-- We extract the 'discord_id' claim using the ->> operator.
-- This is a custom claim we add in our Edge Function.
--
-- Example JWT payload:
-- {
--   "sub": "123456789012345678",
--   "aud": "authenticated",
--   "role": "authenticated",
--   "discord_id": "123456789012345678",
--   "access_level": "user",
--   "exp": 1234567890
-- }
--
CREATE POLICY "Users can view their own snapshots"
ON player_snapshots
FOR SELECT
TO authenticated
USING (
  discord_id = (auth.jwt() ->> 'discord_id')
);

-- ============================================================================
-- Policy: Admins can view all snapshots
-- ============================================================================
-- Admins (users with the WONKY_LEADER_ROLE in Discord) have access_level = 'admin'
-- in their JWT, which is set by the Edge Function after verifying their Discord roles.
-- This policy allows admins to see all player snapshots for leaderboard and analytics.
--
CREATE POLICY "Admins can view all snapshots"
ON player_snapshots
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'access_level') = 'admin'
);

-- ============================================================================
-- Enable RLS on snapshot_metadata table
-- ============================================================================
ALTER TABLE snapshot_metadata ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view snapshot metadata" ON snapshot_metadata;

-- Policy: All authenticated users can view snapshot metadata
-- (This is non-sensitive aggregate data about when snapshots were taken)
CREATE POLICY "Authenticated users can view snapshot metadata"
ON snapshot_metadata
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
-- These indexes help RLS policies execute efficiently

-- Index on discord_id for fast filtering
CREATE INDEX IF NOT EXISTS idx_player_snapshots_discord_id 
ON player_snapshots(discord_id);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_player_snapshots_discord_date 
ON player_snapshots(discord_id, snapshot_date DESC);

-- ============================================================================
-- Verify RLS is enabled
-- ============================================================================
-- You can run this query to verify RLS is properly configured:
--
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('player_snapshots', 'snapshot_metadata');
--
-- Both tables should show rowsecurity = true
-- ============================================================================

-- ============================================================================
-- Testing RLS Policies
-- ============================================================================
-- To test that RLS is working correctly:
--
-- 1. Get a JWT for a test user from your Edge Function
-- 2. Decode the JWT to see the discord_id claim
-- 3. Use the Supabase SQL Editor with that JWT to run:
--    SELECT * FROM player_snapshots;
-- 4. You should only see rows for that discord_id
--
-- To test as another user, get a different JWT and repeat.
-- Each user should only see their own data.
-- ============================================================================
