import type { NextRequest, NextResponse } from 'next/server';

export type RouteContext = {
  params?: Record<string, string>;
  publicKey?: string;
};

export type Handler = (
  req: NextRequest,
  ctx: RouteContext,
) => Promise<NextResponse>;

export type Middleware = (handler: Handler) => Handler;

export function compose(...middlewares: Middleware[]): (handler: Handler) => Handler {
  return (handler) => middlewares.reduceRight((acc, mw) => mw(acc), handler);
}
