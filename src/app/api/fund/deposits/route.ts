import { type NextRequest } from 'next/server';
import { getDepositsHandler } from '@/server/controller/fund.controller';
import { fromError } from '@/server/lib/http';

export async function GET(req: NextRequest) {
  try { return await getDepositsHandler(req); } catch (e) { return fromError(e); }
}
