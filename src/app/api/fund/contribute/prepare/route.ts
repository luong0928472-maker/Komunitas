import { type NextRequest } from 'next/server';
import { prepareContributionHandler } from '@/server/controller/fund.controller';
import { fromError } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';

export const maxDuration = 60;

const handler = compose(withAuth)(prepareContributionHandler);

export async function POST(req: NextRequest) {
  try { return await handler(req, {}); } catch (e) { return fromError(e); }
}
