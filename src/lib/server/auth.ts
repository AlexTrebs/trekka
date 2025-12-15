import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';

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

  return username === env.adminUser && password === env.adminPass;
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
 * @returns A signed JWT token
 */
export async function createSessionToken(username: string): Promise<string> {
  const secret = getJwtSecret();

  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}

/**
 * Validates a JWT session token
 *
 * @param token - The JWT token to validate
 * @returns The username if valid, null otherwise
 */
export async function validateSessionToken(token: string): Promise<string | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.username === 'string') {
      return payload.username;
    }

    console.debug('[Auth] Invalid token payload: missing username');
    return null;
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
