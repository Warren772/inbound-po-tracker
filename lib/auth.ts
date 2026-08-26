import { cookies } from 'next/headers';

import { SESSION_COOKIE, sessionSecret, verifySession, type Session } from '@/lib/session';

/** Reads the session from a Node request. The Edge sandbox has no next/headers. */
export async function currentSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token, sessionSecret(), Math.floor(Date.now() / 1000));
}
