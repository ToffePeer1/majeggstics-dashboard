import type { AccessLevel, DiscordUser } from '@/types';

/**
 * Permissions Service
 * 
 * Handles access level determination for the application.
 * 
 * SECURITY NOTE:
 * Access level checks on the frontend are for UI purposes only.
 * The real security comes from:
 * 1. The Edge Function validating Discord guild membership and roles
 * 2. Row Level Security (RLS) policies in Supabase
 * 
 * The JWT's access_level claim is set by the Edge Function after verifying
 * the user's Discord roles. This claim is used by RLS policies to filter data.
 * Users cannot modify this claim because JWTs are cryptographically signed.
 */

/**
 * Get the access level for a Discord user
 * The access level comes from the JWT which was set by the Edge Function
 * after verifying Discord guild membership and roles
 */
export function getUserAccessLevel(_user: DiscordUser | null, accessLevel: AccessLevel | null): AccessLevel {
  // Access level is determined server-side and included in the JWT
  return accessLevel || 'user';
}

/**
 * Check if the given access level can view all data
 * Admins can view all player data, users can only see their own
 */
export function canViewAllData(accessLevel: AccessLevel): boolean {
  return accessLevel === 'admin';
}

/**
 * Get the Discord avatar URL for a user
 */
export function getDiscordAvatarUrl(user: DiscordUser | null, size: number = 128): string | null {
  if (!user || !user.avatar) {
    return null;
  }
  return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=${size}`;
}
