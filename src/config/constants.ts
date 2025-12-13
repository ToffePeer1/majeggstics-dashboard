// Configuration constants for the application

export const PAGE_TITLE = 'Majeggstics Dashboard';

// Database table names
export const TABLE_PLAYER_SNAPSHOTS = 'player_snapshots';
export const TABLE_SNAPSHOT_METADATA = 'snapshot_metadata';
export const TABLE_WEEKLY_STATISTICS = 'weekly_statistics';

// Materialized views
export const VIEW_UNIQUE_PLAYERS_LATEST = 'unique_players_latest';

// CSV Export Headers - Used for exporting player snapshot data
export const CSV_EXPORT_HEADERS = [
  'snapshot_date',
  'eb',
  'se',
  'pe',
  'te',
  'num_prestiges',
  'farmer_role',
  'grade',
  'active'
] as const;

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  PLAYER_LIST: 3_600_000, // 1 hour
  LATEST_SNAPSHOT: 3_600_000, // 1 hour
  PLAYER_DATA: 3_600_000, // 1 hour
};


// Environment variables with fallbacks
export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  EGGINC_GUILD: import.meta.env.VITE_EGGINC_GUILD || '',
  WONKY_LEADER_ROLE: import.meta.env.VITE_EGGINC_WONKY_LEADER_ROLE || '',
  MAJ_ROLE: import.meta.env.VITE_EGGINC_MAJ_ROLE || '',
  // Discord OAuth configuration
  DISCORD_CLIENT_ID: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
} as const;

// Discord OAuth Configuration
// SECURITY NOTE: CLIENT_SECRET is NEVER exposed to the frontend
// It's only used in the Edge Function for token exchange
export const DISCORD_CONFIG = {
  // OAuth endpoints
  AUTHORIZE_URL: 'https://discord.com/api/oauth2/authorize',
  
  // We only request 'identify' and 'guilds.members.read' scopes - no email or other data needed
  // This minimizes the data we access from Discord
  SCOPES: ['identify', 'guilds.members.read'],
  
  // The callback path in your app (will be combined with origin)
  CALLBACK_PATH: '/auth/callback',
  
  // Local storage key for the JWT
  JWT_STORAGE_KEY: 'discord_jwt',
  
  // Local storage key for user info
  USER_STORAGE_KEY: 'discord_user',
  
  // JWT expiration buffer (refresh 1 hour before expiry)
  EXPIRATION_BUFFER_MS: 60 * 60 * 1000,
} as const;

// Edge Function endpoints
export const EDGE_FUNCTIONS = {
  DISCORD_AUTH: '/functions/v1/discord-auth',
  GET_LEADERBOARD: '/functions/v1/get-leaderboard',
  GET_PLAYER_CURRENT_STATS: '/functions/v1/get-player-current-stats',
} as const;

// Grade colors for charts
export const GRADE_COLORS = {
  AAA: '#df4e56',
  AA: '#efa345',
  A: '#9a08d5',
  B: '#3f88c7',
  C: '#b8b8b8',
} as const;

export const GRADES = ['AAA', 'AA', 'A', 'B', 'C'] as const;