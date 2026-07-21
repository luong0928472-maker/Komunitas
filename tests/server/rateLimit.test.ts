import { describe, it, expect, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import {
  __resetRateLimitBuckets,
  rateLimit,
  withRateLimit,
} from '@/server/middleware/rateLimit';

function makeReq(ip: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (ip) headers['x-forwarded-for'] = ip;
  return new Request('http://localhost/test', { method: 'POST', headers }) as unknown as NextRequest;
}

describe('rateLimit middleware', () => {
  beforeEach(() => {
    __resetRateLimitBuckets();
  });

  it('allows up to capacity requests per IP', async () => {
    const mw = rateLimit({ key: 'test.allow', capacity: 3, refillPerMinute: 3 });
    const handler = mw(async () => new Response('ok'));
    const r1 = await handler(makeReq('1.2.3.4'), {});
    const r2 = await handler(makeReq('1.2.3.4'), {});
    const r3 = await handler(makeReq('1.2.3.4'), {});
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
  });

  it('rejects requests beyond capacity for the same IP', async () => {
    const mw = rateLimit({ key: 'test.block', capacity: 2, refillPerMinute: 2 });
    const handler = mw(async () => new Response('ok'));
    await handler(makeReq('5.5.5.5'), {});
    await handler(makeReq('5.5.5.5'), {});
    const blocked = await handler(makeReq('5.5.5.5'), {});
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('tracks buckets per IP independently', async () => {
    const mw = rateLimit({ key: 'test.iso', capacity: 1, refillPerMinute: 1 });
    const handler = mw(async () => new Response('ok'));
    const a = await handler(makeReq('10.0.0.1'), {});
    const b = await handler(makeReq('10.0.0.2'), {});
    const aBlocked = await handler(makeReq('10.0.0.1'), {});
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(aBlocked.status).toBe(429);
  });

  it('uses separate buckets for different keys', async () => {
    const a = rateLimit({ key: 'test.kA', capacity: 1, refillPerMinute: 1 })(
      async () => new Response('ok'),
    );
    const b = rateLimit({ key: 'test.kB', capacity: 1, refillPerMinute: 1 })(
      async () => new Response('ok'),
    );
    const a1 = await a(makeReq('1.1.1.1'), {});
    const b1 = await b(makeReq('1.1.1.1'), {});
    expect(a1.status).toBe(200);
    expect(b1.status).toBe(200);
  });

  it('withRateLimit throws AppError RATE_LIMITED once exhausted', async () => {
    const wrapped = withRateLimit(
      async () => new Response('ok'),
      { key: 'test.wrap', capacity: 1, refillPerMinute: 1 },
    );
    const first = await wrapped(makeReq('9.9.9.9'));
    expect(first.status).toBe(200);
    await expect(wrapped(makeReq('9.9.9.9'))).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
    });
  });

  it('falls back to "unknown" when no IP header is present', async () => {
    const mw = rateLimit({ key: 'test.noip', capacity: 1, refillPerMinute: 1 });
    const handler = mw(async () => new Response('ok'));
    const a = await handler(makeReq(null), {});
    const b = await handler(makeReq(null), {});
    expect(a.status).toBe(200);
    expect(b.status).toBe(429);
  });
});
