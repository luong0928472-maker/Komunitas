import { type NextRequest } from 'next/server';
import { getPoolHandler } from '@/server/controller/fund.controller';
import { fromError } from '@/server/lib/http';

export async function GET(req: NextRequest) {
  try { return await getPoolHandler(req); } catch (e) { return fromError(e); }
}
