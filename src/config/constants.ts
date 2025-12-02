// Configuration constants for the application

export const PAGE_TITLE = 'Maj Statistics Analytics';

// Database table names
export const TABLE_PLAYER_SNAPSHOTS = 'player_snapshots';
export const TABLE_SNAPSHOT_METADATA = 'snapshot_metadata';
export const TABLE_WEEKLY_STATISTICS = 'weekly_statistics';

// Materialized views
export const VIEW_UNIQUE_PLAYERS_LATEST = 'unique_players_latest';

// Numeric columns
export const LARGE_NUMERIC_COLUMNS = ['eb', 'se'];

export const NUMERIC_COLUMNS = {
  eb: 'Earnings Bonus',
  se: 'Soul Eggs',
  pe: 'Prophecy Eggs',
  te: 'Truth Eggs',
  num_prestiges: 'Number of Prestiges',
} as const;

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
} as const;

// Grade colors for charts
export const GRADE_COLORS = {
  aaa: '#df4e56',
  aa: '#efa345',
  a: '#9a08d5',
  b: '#3f88c7',
  c: '#b8b8b8',
} as const;
