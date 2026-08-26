import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, sessionSecret, verifySession } from '@/lib/session';

/** Redirects signed-out humans off the two CRUD routes. The real gate is in app/actions.ts. */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token
    ? await verifySession(token, sessionSecret(), Math.floor(Date.now() / 1000))
    : null;

  if (session) return NextResponse.next();

  const signIn = request.nextUrl.clone();
  signIn.pathname = '/login';
  signIn.search = '';
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ['/purchase-orders/new', '/purchase-orders/:poNumber/edit'],
};
