import type { NextRequest, NextResponse } from 'next/server';
import { AppError, fail } from '@/server/lib/http';
import type { Handler, Middleware } from './compose';

interface Bucket {
  tokens: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  key: string;
  capacity: number;
  refillPerMinute: number;
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function take(key: string, capacity: number, refillPerMinute: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { tokens: capacity, resetAt: now + 60_000 };
    buckets.set(key, bucket);
  }
  const refillPerMs = refillPerMinute / 60_000;
  const elapsed = now - (bucket.resetAt - 60_000);
  if (elapsed > 0) {
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
    bucket.resetAt = now + 60_000;
  }
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

export function rateLimit(opts: RateLimitOptions): Middleware {
  return (handler: Handler) => async (req: NextRequest, ctx) => {
    const ip = getClientIp(req);
    const allowed = take(`${opts.key}:${ip}`, opts.capacity, opts.refillPerMinute);
    if (!allowed) {
      return fail('RATE_LIMITED', 'Too many requests. Please slow down.', 429);
    }
    return handler(req, ctx);
  };
}

export function __resetRateLimitBuckets(): void {
  buckets.clear();
}

export function withRateLimit<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  opts: RateLimitOptions,
): (req: NextRequest) => Promise<NextResponse<T> | NextResponse<{ ok: false; error: { code: string; message: string } }>> {
  return async (req) => {
    const ip = getClientIp(req);
    if (!take(`${opts.key}:${ip}`, opts.capacity, opts.refillPerMinute)) {
      throw new AppError('RATE_LIMITED', 'Too many requests. Please slow down.', 429);
    }
    return handler(req);
  };
}
