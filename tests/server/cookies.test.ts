import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac } from 'node:crypto';

beforeAll(() => {
  process.env.DRIZZLE_DATABASE_URL =
    process.env.DRIZZLE_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/test';
  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET ?? 'test-session-secret-32-chars-min-len-1234';
});

function buildReq(cookieValue: string | undefined) {
  const cookies = new Map<string, { name: string; value: string }>();
  if (cookieValue !== undefined) {
    cookies.set('komunitas_session', { name: 'komunitas_session', value: cookieValue });
  }
  return {
    cookies: {
      get: (name: string) => cookies.get(name),
    },
  };
}

async function importCookies() {
  const mod = await import('@/server/lib/cookies');
  return mod;
}

describe('session cookie HMAC', () => {
  it('round-trips a signed session id', async () => {
    const { readSessionCookie } = await importCookies();
    const sessionId = '11111111-2222-3333-4444-555555555555';
    const hmac = createHmac('sha256', process.env.SESSION_SECRET!).update(sessionId).digest('hex');
    const cookieValue = `${sessionId}.${hmac}`;
    const req = buildReq(cookieValue) as unknown as Parameters<typeof readSessionCookie>[0];
    expect(readSessionCookie(req)).toBe(sessionId);
  });

  it('rejects a cookie missing the HMAC suffix', async () => {
    const { readSessionCookie } = await importCookies();
    const req = buildReq('plain-session-id-no-hmac') as unknown as Parameters<
      typeof readSessionCookie
    >[0];
    expect(readSessionCookie(req)).toBeUndefined();
  });

  it('rejects a cookie signed with the wrong secret', async () => {
    const { readSessionCookie } = await importCookies();
    const sessionId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const hmac = createHmac('sha256', 'a-different-secret-of-32-chars-or-more!').update(sessionId).digest('hex');
    const req = buildReq(`${sessionId}.${hmac}`) as unknown as Parameters<typeof readSessionCookie>[0];
    expect(readSessionCookie(req)).toBeUndefined();
  });

  it('returns undefined when no cookie is present', async () => {
    const { readSessionCookie } = await importCookies();
    const req = buildReq(undefined) as unknown as Parameters<typeof readSessionCookie>[0];
    expect(readSessionCookie(req)).toBeUndefined();
  });
});