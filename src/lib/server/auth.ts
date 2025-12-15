import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';
import { timingSafeEqual } from 'crypto';

/**
 * JWT payload structure for session tokens
 */
export interface SessionPayload {
  username: string;
  isAdmin: boolean;
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to maintain constant time
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}


/**
 * Validates admin credentials against environment variables
 *
 * @param username - The username to validate
 * @param password - The password to validate
 * @returns True if credentials are valid, false otherwise
 */
export function validateAdminCredentials(username: string, password: string): boolean {

  if (!env.adminUser || !env.adminPass) {
    console.warn('[Auth] Admin credentials not configured in environment variables');
    return false;
  }

  return safeCompare(username, env.adminUser) && safeCompare(password, env.adminPass);
}

/**
 * Get the JWT secret as a Uint8Array for jose
 */
function getJwtSecret(): Uint8Array {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  return new TextEncoder().encode(env.jwtSecret);
}

/**
 * Creates a JWT session token for authenticated users
 *
 * @param username - The authenticated username
 * @param isAdmin - Whether the user has admin privileges
 * @returns A signed JWT token
 */
export async function createSessionToken(username: string, isAdmin: boolean): Promise<string> {
  const secret = getJwtSecret();

  const token = await new SignJWT({ username, isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}

/**
 * Validates a JWT session token and returns the payload
 *
 * @param token - The JWT token to validate
 * @returns The session payload if valid, null otherwise
 */
export async function validateSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    // Validate required fields
    if (typeof payload.username !== 'string') {
      console.debug('[Auth] Invalid token payload: missing or invalid username');
      return null;
    }

    if (typeof payload.isAdmin !== 'boolean') {
      console.debug('[Auth] Invalid token payload: missing or invalid isAdmin claim');
      return null;
    }

    return {
      username: payload.username,
      isAdmin: payload.isAdmin
    };
  } catch (error) {
    console.debug('[Auth] Invalid or expired session token:', error);
    return null;
  }
}

/**
 * Checks if admin authentication is configured
 *
 * @returns True if admin credentials are set in environment variables
 */
export function isAdminConfigured(): boolean {
  return !!(env.adminUser && env.adminPass);
}
