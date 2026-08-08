import { type NextRequest } from 'next/server';
import { listProposals } from '@/server/controller/proposal.controller';
import { fromError } from '@/server/lib/http';

export async function GET(req: NextRequest) {
  try { return await listProposals(req); } catch (e) { return fromError(e); }
}
