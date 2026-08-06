import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { sessions } from '@/server/db/schema';
import { readSessionCookie } from '@/server/lib/cookies';
import { ok, fromError } from '@/server/lib/http';

// Optional auth: never 401s. Returns the connected wallet or null so the client
// can restore a session on reload and render browse views while disconnected.
export async function GET(req: NextRequest) {
  try {
    const sessionId = readSessionCookie(req);
    if (!sessionId) return ok({ publicKey: null });
    const [row] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!row || row.expiresAt.getTime() < Date.now()) return ok({ publicKey: null });
    return ok({ publicKey: row.publicKey });
  } catch (e) {
    return fromError(e);
  }
}
