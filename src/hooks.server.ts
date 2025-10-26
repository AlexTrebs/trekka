import type { Handle } from "@sveltejs/kit";
import { redirect, error } from "@sveltejs/kit";
import { getSession } from "$lib/server/session";
import { ADMIN_USER } from "$env/static/private";

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;

  // Block ALL /admin routes if ADMIN_USER not configured
  if (path.startsWith("/admin") && !ADMIN_USER) {
    throw error(403, "Admin access is disabled");
  }

  const session = getSession(event.cookies.get("session"));
  if (
    path.startsWith("/admin") &&
    !path.startsWith("/admin/login") &&
    !session
  ) {
    throw redirect(303, "/admin/login");
  }

  return resolve(event);
};
