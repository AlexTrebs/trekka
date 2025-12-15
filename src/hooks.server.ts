import type { Handle } from '@sveltejs/kit';
import { validateSessionToken } from '$lib/server/auth';

/**
 * Main request handler hook
 *
 * Runs on every request to check authentication for admin routes.
 * Non-admin routes pass through without authentication.
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Extract session token from cookies
  const sessionToken = event.cookies.get('session');

  // Validate session and add user to locals
  if (sessionToken) {
    const username = await validateSessionToken(sessionToken);
    if (username) {
      event.locals.user = {
        username,
        isAdmin: true
      };
    }
  }

  // Check authentication for admin routes (when implemented)
  if (event.url.pathname.startsWith('/admin')) {
    if (!event.locals.user?.isAdmin) {
      // Redirect to login page (to be implemented)
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
  }

  return resolve(event);
};
