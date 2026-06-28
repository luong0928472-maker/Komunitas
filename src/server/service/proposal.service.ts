import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { fundPool, members, proposals, votes } from '@/server/db/schema';
import type { ProposalStatus } from '@/server/db/schema/proposals';
import {
  type AssetCode,
  addr,
  bool,
  i128,
  prepareInvoke,
  readContract,
  submitSigned,
  u64,
} from '@/server/stellar';
import { AppError } from '@/server/lib/http';
import { logger } from '@/server/lib/logger';

/**
 * Normalize a Soroban ProposalStatus into our DB status string. The contract's
 * integer-discriminant enum decodes to a number (0=Active,1=Passed,2=Funded,
 * 3=Rejected); we also tolerate string / { tag } shapes defensively.
 */
function mapStatus(raw: unknown): ProposalStatus {
  let tag: string;
  if (typeof raw === 'number' || typeof raw === 'bigint') {
    tag = ['Active', 'Passed', 'Funded', 'Rejected'][Number(raw)] ?? 'Active';
  } else if (typeof raw === 'string') {
    tag = raw;
  } else if (raw && typeof raw === 'object' && 'tag' in raw) {
    tag = String((raw as { tag: unknown }).tag);
  } else {
    tag = 'Active';
  }
  switch (tag) {
    case 'Funded':
      return 'funded';
    case 'Passed':
      return 'passed';
    case 'Rejected':
      return 'rejected';
    default:
      return 'active';
  }
}

export const proposalService = {
  /** Build the unsigned `create_proposal(proposer, recipient, amount)` invocation. */
  async prepareCreate(proposerPublicKey: string, recipientAddress: string, requestStroops: string) {
    const xdr = await prepareInvoke(
      proposerPublicKey,
      'create_proposal',
      addr(proposerPublicKey),
      addr(recipientAddress),
      i128(requestStroops),
    );
    return { xdr };
  },

  /** Submit the signed create, capture the on-chain id, and persist metadata. */
  async submitCreate(
    proposerPublicKey: string,
    signedXdr: string,
    meta: {
      title: string;
      description: string;
      requestStroops: string;
      assetCode: AssetCode;
      recipientAddress: string;
      votingDurationHours: number;
    },
  ) {
    const { hash: txHash, returnValue } = await submitSigned(signedXdr);
    let onchainId = String(returnValue ?? '');
    if (!onchainId) {
      onchainId = await this.resolveOrphanedProposalId(proposerPublicKey, txHash);
      if (!onchainId) {
        throw new AppError(
          'CONFLICT',
          'The contract did not return a proposal id. Please retry.',
          409,
        );
      }
      logger.warn(
        `Proposal orphan-recovered by ${proposerPublicKey} tx ${txHash} onchainId=${onchainId}`,
      );
    }

    const votingDeadline = new Date(Date.now() + meta.votingDurationHours * 3600 * 1000);
    const [proposal] = await db
      .insert(proposals)
      .values({
        title: meta.title,
        description: meta.description,
        requestStroops: meta.requestStroops,
        assetCode: meta.assetCode,
        recipientAddress: meta.recipientAddress,
        proposerPublicKey,
        onchainId,
        createTxHash: txHash,
        votingDeadline,
        status: 'active',
      })
      .returning();
    if (!proposal) throw new AppError('INTERNAL', 'Failed to create proposal', 500);
    logger.info(`Proposal ${proposal.id} created on-chain id=${onchainId} tx ${txHash}`);
    return proposal;
  },

  async list(status?: ProposalStatus) {
    if (status) {
      return db
        .select()
        .from(proposals)
        .where(eq(proposals.status, status))
        .orderBy(desc(proposals.createdAt));
    }
    return db.select().from(proposals).orderBy(desc(proposals.createdAt));
  },

  async getById(id: string) {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
    if (!proposal) throw new AppError('NOT_FOUND', 'Proposal not found', 404);
    return proposal;
  },

  async getVotes(proposalId: string) {
    return db
      .select()
      .from(votes)
      .where(eq(votes.proposalId, proposalId))
      .orderBy(desc(votes.createdAt));
  },

  /** Validate, then build the unsigned `vote(voter, onchainId, in_favor)` invocation. */
  async prepareVote(proposalId: string, voterPublicKey: string, inFavor: boolean) {
    const proposal = await proposalService.getById(proposalId);
    if (!proposal.onchainId) {
      throw new AppError('CONFLICT', 'This proposal is not on-chain yet.', 409);
    }
    if (proposal.status !== 'active') {
      throw new AppError('CONFLICT', 'Voting on this proposal has closed', 409);
    }
    if (new Date() > proposal.votingDeadline) {
      throw new AppError('CONFLICT', 'The voting window has ended', 409);
    }
    const onchain = (await readContract('get_proposal', u64(proposal.onchainId))) as {
      status?: unknown;
    };
    if (mapStatus(onchain.status) !== 'active') {
      throw new AppError('CONFLICT', 'Proposal is no longer active on-chain', 409);
    }
    const [already] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.proposalId, proposalId), eq(votes.voterPublicKey, voterPublicKey)))
      .limit(1);
    if (already) throw new AppError('ALREADY_EXISTS', 'You already voted on this proposal', 409);

    const xdr = await prepareInvoke(
      voterPublicKey,
      'vote',
      addr(voterPublicKey),
      u64(proposal.onchainId),
      bool(inFavor),
    );
    return { xdr };
  },

  /**
   * Submit the signed vote. The contract tallies the vote and, on a strict
   * majority, disburses to the recipient in the same transaction. We then read
   * the authoritative on-chain proposal and mirror it into the database.
   */
  async submitVote(proposalId: string, voterPublicKey: string, signedXdr: string, inFavor: boolean) {
    const proposal = await proposalService.getById(proposalId);
    if (!proposal.onchainId) {
      throw new AppError('CONFLICT', 'This proposal is not on-chain yet.', 409);
    }

    const { hash: txHash } = await submitSigned(signedXdr);

    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.publicKey, voterPublicKey))
      .limit(1);
    const weightStroops = member?.contributedStroops ?? '0';
    await db
      .insert(votes)
      .values({ proposalId, voterPublicKey, inFavor, weightStroops, stellarTxHash: txHash });

    const updated = await proposalService.reconcileProposal(proposalId, txHash);

    logger.info(`Vote on ${proposalId} by ${voterPublicKey} tx ${txHash} → ${updated.status}`);
    return updated;
  },

  /**
   * Read the authoritative on-chain proposal and mirror it into the database:
   * vote tallies, status, releaseTxHash on funding, and pool totalReleasedStroops.
   * Reusable from vote submission and admin disburse reconciliation.
   */
  async reconcileProposal(proposalId: string, txHash?: string) {
    const proposal = await proposalService.getById(proposalId);
    if (!proposal.onchainId) {
      throw new AppError('CONFLICT', 'This proposal is not on-chain yet.', 409);
    }

    const onchain = (await readContract('get_proposal', u64(proposal.onchainId))) as {
      votes_yes?: bigint | number;
      votes_no?: bigint | number;
      status?: unknown;
    };
    const votesYes = String(onchain.votes_yes ?? 0);
    const votesNo = String(onchain.votes_no ?? 0);
    const totalVoters = (BigInt(votesYes) + BigInt(votesNo)).toString();
    const status = mapStatus(onchain.status);

    const update: Record<string, unknown> = { votesYes, votesNo, totalVoters, status };
    if (status === 'funded' && proposal.status !== 'funded') {
      update.fundedAt = new Date();
      const [pool] = await db.select().from(fundPool).limit(1);
      if (pool) {
        await db
          .update(fundPool)
          .set({
            totalReleasedStroops: (
              BigInt(pool.totalReleasedStroops) + BigInt(proposal.requestStroops)
            ).toString(),
            updatedAt: new Date(),
          })
          .where(eq(fundPool.id, pool.id));
      }
      update.releaseTxHash = txHash ?? null;
    }

    const [updated] = await db
      .update(proposals)
      .set(update)
      .where(eq(proposals.id, proposalId))
      .returning();

    return updated!;
  },

  async getStats() {
    const allProposals = await db.select().from(proposals);
    const allMembers = await db.select().from(members);
    const [pool] = await db.select().from(fundPool).limit(1);
    return {
      totalProposals: allProposals.length,
      activeProposals: allProposals.filter((p) => p.status === 'active').length,
      fundedProposals: allProposals.filter((p) => p.status === 'funded').length,
      totalMembers: allMembers.length,
      totalContributedStroops: pool?.totalContributedStroops ?? '0',
      totalReleasedStroops: pool?.totalReleasedStroops ?? '0',
    };
  },

  /**
   * Recover the on-chain id when the create_proposal return value could not be
   * decoded but the tx settled on-chain. Tries get_proposal_count first (fast),
   * then scans the most recent proposals backwards. Returns '' when nothing
   * matches — caller throws a CONFLICT so the user can retry safely.
   */
  async resolveOrphanedProposalId(proposerPublicKey: string, txHash: string): Promise<string> {
    try {
      const count = (await readContract('get_proposal_count')) as bigint | number | null;
      if (count !== null && count !== undefined) {
        const last = BigInt(count);
        if (last > 0n) {
          const candidate = last.toString();
          const onchain = (await readContract('get_proposal', u64(candidate))) as {
            proposer?: string;
            create_tx_hash?: string;
            title?: string;
          } | null;
          if (onchain && (onchain.create_tx_hash === txHash || onchain.proposer === proposerPublicKey)) {
            return candidate;
          }
        }
      }
    } catch (e) {
      logger.warn(`resolveOrphanedProposalId: get_proposal_count failed: ${String(e)}`);
    }

    try {
      const latest = await proposalService.list();
      for (const row of latest) {
        if (row.createTxHash === txHash && row.onchainId) return row.onchainId;
      }
    } catch (e) {
      logger.warn(`resolveOrphanedProposalId: db list scan failed: ${String(e)}`);
    }

    return '';
  },
};
