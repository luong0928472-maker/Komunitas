import { type NextRequest } from 'next/server';
import { verifyChallenge } from '@/server/controller/auth.controller';
import { fromError } from '@/server/lib/http';
import { withRateLimit } from '@/server/middleware/rateLimit';

const limited = withRateLimit(
  async (req: NextRequest) => verifyChallenge(req),
  { key: 'auth.verify', capacity: 10, refillPerMinute: 10 },
);

export async function POST(req: NextRequest) {
  try {
    return await limited(req);
  } catch (e) {
    return fromError(e);
  }
}
