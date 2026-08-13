import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { ok, created } from '@/server/lib/http';
import { fundService } from '@/server/service/fund.service';
import type { RouteContext } from '@/server/middleware/compose';

const prepareSchema = z.object({
  amountStroops: z.string().regex(/^\d+$/, 'Amount must be a whole stroop value'),
});
const submitSchema = z.object({
  signedXdr: z.string().min(1),
  amountStroops: z.string().regex(/^\d+$/, 'Amount must be a whole stroop value'),
});
const trustlineSubmitSchema = z.object({ signedXdr: z.string().min(1) });

const membersQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

const depositsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export async function prepareContributionHandler(req: NextRequest, ctx: RouteContext) {
  const body = prepareSchema.parse(await req.json());
  const out = await fundService.prepareContribution(ctx.publicKey!, body.amountStroops);
  return ok(out);
}

export async function submitContributionHandler(req: NextRequest, ctx: RouteContext) {
  const { signedXdr, amountStroops } = submitSchema.parse(await req.json());
  const out = await fundService.submitContribution(ctx.publicKey!, signedXdr, amountStroops);
  return created(out);
}

export async function prepareTrustlineHandler(_req: NextRequest, ctx: RouteContext) {
  const out = await fundService.prepareUsdcTrustline(ctx.publicKey!);
  return ok(out);
}

export async function submitTrustlineHandler(req: NextRequest, ctx: RouteContext) {
  const { signedXdr } = trustlineSubmitSchema.parse(await req.json());
  const out = await fundService.submitUsdcTrustline(ctx.publicKey!, signedXdr);
  return created(out);
}

export async function getPoolHandler(_req: NextRequest) {
  return ok(await fundService.getPool());
}

export async function getMembersHandler(req: NextRequest) {
  const params = membersQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(await fundService.getMembers(params));
}

export async function getDepositsHandler(req: NextRequest) {
  const params = depositsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(await fundService.getRecentDeposits(params.limit));
}
