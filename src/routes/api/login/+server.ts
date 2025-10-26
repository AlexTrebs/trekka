import type { RequestHandler } from "@sveltejs/kit";
import { ADMIN_USER, ADMIN_PASS } from "$env/static/private";
import { createSession, getSession, destroySession } from "$lib/server/session";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { username, password } = await request.json();

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const { id, expires } = createSession();
    cookies.set("session", id, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      expires: new Date(expires),
    });
    return new Response("ok");
  }

  return new Response("unauthorized", { status: 401 });
};

export const GET: RequestHandler = async ({ cookies }) => {
  const session = getSession(cookies.get("session"));
  return new Response(JSON.stringify(session), {
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: RequestHandler = async ({ cookies }) => {
  const id = cookies.get("session");
  if (id) destroySession(id);
  cookies.delete("session", { path: "/" });
  return new Response("logged out");
};
