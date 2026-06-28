import { type NextRequest } from 'next/server';
import { requestChallenge } from '@/server/controller/auth.controller';
import { fromError } from '@/server/lib/http';
import { withRateLimit } from '@/server/middleware/rateLimit';

const limited = withRateLimit(
  async (req: NextRequest) => requestChallenge(req),
  { key: 'auth.challenge', capacity: 10, refillPerMinute: 10 },
);

export async function POST(req: NextRequest) {
  try {
    return await limited(req);
  } catch (e) {
    return fromError(e);
  }
}
