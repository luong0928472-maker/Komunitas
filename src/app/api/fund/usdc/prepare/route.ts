import { type NextRequest } from 'next/server';
import { prepareTrustlineHandler } from '@/server/controller/fund.controller';
import { fromError } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';

const handler = compose(withAuth)(prepareTrustlineHandler);

export async function POST(req: NextRequest) {
  try { return await handler(req, {}); } catch (e) { return fromError(e); }
}
