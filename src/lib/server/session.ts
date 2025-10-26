export const sessions = new Map<string, { expires: number }>();

export function getSession(id: string | undefined) {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;

  if (session.expires < Date.now()) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function createSession() {
  const id = crypto.randomUUID();
  const expires = Date.now() + 1000 * 60 * 60; // 1h
  sessions.set(id, { expires });
  return { id, expires };
}

export function destroySession(id: string) {
  sessions.delete(id);
}
