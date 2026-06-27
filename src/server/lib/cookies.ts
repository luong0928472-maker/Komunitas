import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { env } from '@/server/config/env';

export function readSessionCookie(req: NextRequest): string | undefined {
  return req.cookies.get(env.SESSION_COOKIE_NAME)?.value;
}

export function setSessionCookie<T>(res: NextResponse<T>, sessionId: string): void {
  res.cookies.set(env.SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.SESSION_TTL_SECONDS,
    path: '/',
  });
}

export function clearSessionCookie<T>(res: NextResponse<T>): void {
  res.cookies.delete(env.SESSION_COOKIE_NAME);
}
