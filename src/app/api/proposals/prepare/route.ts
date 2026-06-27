import { type NextRequest } from 'next/server';
import { prepareCreateProposal } from '@/server/controller/proposal.controller';
import { fromError } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';

export const maxDuration = 60;

const handler = compose(withAuth)(prepareCreateProposal);

export async function POST(req: NextRequest) {
  try { return await handler(req, {}); } catch (e) { return fromError(e); }
}
