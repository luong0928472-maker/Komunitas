import { type NextRequest } from 'next/server';
import { getProposal } from '@/server/controller/proposal.controller';
import { fromError } from '@/server/lib/http';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await getProposal(req, { params: { id } });
  } catch (e) { return fromError(e); }
}
