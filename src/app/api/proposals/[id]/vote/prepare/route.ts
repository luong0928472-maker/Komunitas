import { type NextRequest } from 'next/server';
import { prepareVote } from '@/server/controller/proposal.controller';
import { fromError } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';

export const maxDuration = 60;

const handler = compose(withAuth)(async (req, ctx) => prepareVote(req, ctx));

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await handler(req, { params: { id } });
  } catch (e) { return fromError(e); }
}
