import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { env } from '@/server/config/env';

function signSessionId(sessionId: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(sessionId).digest('hex');
}

function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export function readSessionCookie(req: NextRequest): string | undefined {
  const raw = req.cookies.get(env.SESSION_COOKIE_NAME)?.value;
  if (!raw) return undefined;
  const idx = raw.lastIndexOf('.');
  if (idx <= 0 || idx === raw.length - 1) return undefined;
  const sessionId = raw.slice(0, idx);
  const providedHmac = raw.slice(idx + 1);
  const expectedHmac = signSessionId(sessionId);
  if (!safeHexEqual(providedHmac, expectedHmac)) return undefined;
  return sessionId;
}

export function setSessionCookie<T>(res: NextResponse<T>, sessionId: string): void {
  const hmac = signSessionId(sessionId);
  res.cookies.set(env.SESSION_COOKIE_NAME, `${sessionId}.${hmac}`, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: env.SESSION_TTL_SECONDS,
    path: '/',
  });
}

export function clearSessionCookie<T>(res: NextResponse<T>): void {
  res.cookies.delete(env.SESSION_COOKIE_NAME);
}