//@ts-nocheck
// ============================================================================
// Shared Authentication Utilities
// ============================================================================

import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

/**
 * Standard JWT payload structure for user authentication
 */
export interface UserJWTPayload {
  sub: string;
  discord_id: string;
  access_level: 'user' | 'admin';
  exp: number;
  iat: number;
}

/**
 * Service role JWT payload structure (from Supabase)
 */
export interface ServiceRoleJWTPayload {
  iss: string;
  ref: string;
  role: 'service_role';
  iat: number;
  exp: number;
}

/**
 * Verify and decode JWT from Authorization header
 * 
 * @param authHeader - Authorization header value
 * @param jwtSecret - JWT signing secret
 * @returns Decoded JWT payload or null if invalid
 */
export async function verifyJWT(
  authHeader: string | null,
  jwtSecret: string
): Promise<UserJWTPayload | ServiceRoleJWTPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const payload = await verify(token, cryptoKey);
    return payload as unknown as (UserJWTPayload | ServiceRoleJWTPayload);
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Check if JWT payload is from service role
 */
export function isServiceRole(payload: UserJWTPayload | ServiceRoleJWTPayload | null): payload is ServiceRoleJWTPayload {
  return payload !== null && 'role' in payload && payload.role === 'service_role';
}

/**
 * Check if JWT payload is from an admin user
 */
export function isAdmin(payload: UserJWTPayload | ServiceRoleJWTPayload | null): payload is UserJWTPayload {
  return payload !== null && 'access_level' in payload && payload.access_level === 'admin';
}
