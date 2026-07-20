import { z } from 'zod';
import { StrKey } from '@stellar/stellar-sdk';
import type { NextRequest } from 'next/server';
import { ok, created } from '@/server/lib/http';
import { proposalService } from '@/server/service/proposal.service';
import { fundService } from '@/server/service/fund.service';
import type { RouteContext } from '@/server/middleware/compose';
import type { ProposalStatus } from '@/server/db/schema/proposals';
import { AppError } from '@/server/lib/http';

const stroopsSchema = z
  .string()
  .regex(/^\d+$/)
  .refine((v) => BigInt(v) > 0n, 'Amount must be positive');

const recipientSchema = z
  .string()
  .refine((v) => StrKey.isValidEd25519PublicKey(v), 'Invalid recipient address');

const prepareCreateSchema = z.object({
  recipientAddress: recipientSchema,
  requestStroops: stroopsSchema,
});

const submitCreateSchema = z.object({
  signedXdr: z.string().min(1),
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(2000),
  requestStroops: stroopsSchema,
  asset: z.enum(['XLM']).default('XLM'),
  recipientAddress: recipientSchema,
  votingDurationHours: z.number().int().positive().max(720).default(72),
});

const prepareVoteSchema = z.object({ inFavor: z.boolean() });
const submitVoteSchema = z.object({ signedXdr: z.string().min(1), inFavor: z.boolean() });

export async function listProposals(req: NextRequest) {
  const status = new URL(req.url).searchParams.get('status') as ProposalStatus | null;
  return ok(await proposalService.list(status ?? undefined));
}

/** Phase 1: build the unsigned create_proposal invocation. */
export async function prepareCreateProposal(req: NextRequest, ctx: RouteContext) {
  const body = prepareCreateSchema.parse(await req.json());

  const pool = await fundService.getPool();
  const available = BigInt(pool.totalContributedStroops) - BigInt(pool.totalReleasedStroops);
  if (BigInt(body.requestStroops) > available) {
    throw new AppError(
      'CONFLICT',
      'Requested amount exceeds the treasury balance. Contribute more or lower the ask.',
      409,
    );
  }
  const out = await proposalService.prepareCreate(
    ctx.publicKey!,
    body.recipientAddress,
    body.requestStroops,
  );
  return ok(out);
}

/** Phase 2: submit the signed create and persist proposal metadata. */
export async function submitCreateProposal(req: NextRequest, ctx: RouteContext) {
  const body = submitCreateSchema.parse(await req.json());
  const proposal = await proposalService.submitCreate(ctx.publicKey!, body.signedXdr, {
    title: body.title,
    description: body.description,
    requestStroops: body.requestStroops,
    assetCode: body.asset,
    recipientAddress: body.recipientAddress,
    votingDurationHours: body.votingDurationHours,
  });
  return created(proposal);
}

export async function getProposal(_req: NextRequest, ctx: RouteContext) {
  const id = ctx.params?.id ?? '';
  const proposal = await proposalService.getById(id);
  const votes = await proposalService.getVotes(id);
  return ok({ proposal, votes });
}

/** Phase 1: build the unsigned vote invocation. */
export async function prepareVote(req: NextRequest, ctx: RouteContext) {
  const id = ctx.params?.id ?? '';
  const { inFavor } = prepareVoteSchema.parse(await req.json());
  const out = await proposalService.prepareVote(id, ctx.publicKey!, inFavor);
  return ok(out);
}

/** Phase 2: submit the signed vote; the contract may auto-disburse. */
export async function submitVote(req: NextRequest, ctx: RouteContext) {
  const id = ctx.params?.id ?? '';
  const { signedXdr, inFavor } = submitVoteSchema.parse(await req.json());
  const proposal = await proposalService.submitVote(id, ctx.publicKey!, signedXdr, inFavor);
  return created({ proposal });
}

export async function getProposalStats(_req: NextRequest) {
  return ok(await proposalService.getStats());
}
