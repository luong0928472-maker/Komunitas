import { type NextRequest } from 'next/server';
import { env } from '@/server/config/env';
import { prepareInvoke, readContract, u64 } from '@/server/stellar/contract';
import { getTreasuryKeypair } from '@/server/stellar/assets';
import { AppError, fromError, ok } from '@/server/lib/http';
import { logger } from '@/server/lib/logger';
import { proposalService } from '@/server/service/proposal.service';

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!env.ADMIN_SECRET) {
      throw new AppError('FORBIDDEN', 'Admin actions are disabled', 403);
    }
    const headerSecret = req.headers.get('x-admin-secret');
    if (!headerSecret || headerSecret !== env.ADMIN_SECRET) {
      throw new AppError('UNAUTHORIZED', 'Invalid admin credentials', 401);
    }

    const { id } = await params;
    const proposal = await proposalService.getById(id);
    if (!proposal.onchainId) {
      throw new AppError('CONFLICT', 'Proposal is not on-chain yet', 409);
    }

    const onchain = (await readContract('get_proposal', u64(proposal.onchainId))) as {
      status?: unknown;
    };
    const statusRaw = onchain?.status;
    let statusTag: string;
    if (typeof statusRaw === 'number' || typeof statusRaw === 'bigint') {
      statusTag = ['Active', 'Passed', 'Funded', 'Rejected'][Number(statusRaw)] ?? 'Active';
    } else if (statusRaw && typeof statusRaw === 'object' && 'tag' in statusRaw) {
      statusTag = String((statusRaw as { tag: unknown }).tag);
    } else {
      statusTag = String(statusRaw ?? 'Active');
    }

    if (statusTag !== 'Passed') {
      throw new AppError(
        'CONFLICT',
        `Proposal on-chain status is ${statusTag}; can only disburse Passed proposals`,
        409,
      );
    }

    const treasury = getTreasuryKeypair();
    if (!treasury) {
      throw new AppError(
        'FORBIDDEN',
        'TREASURY_SECRET is not configured; cannot sign disburse',
        403,
      );
    }

    const xdr = await prepareInvoke(
      treasury.publicKey(),
      'disburse',
      u64(proposal.onchainId),
    );

    await proposalService.reconcileProposal(id);

    logger.info(`Admin disburse prepared for proposal ${id} (onchain ${proposal.onchainId})`);
    return ok({ xdr, proposalId: id, onchainId: proposal.onchainId });
  } catch (e) {
    return fromError(e);
  }
}