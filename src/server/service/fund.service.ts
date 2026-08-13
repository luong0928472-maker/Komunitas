import { and, desc, eq, gt, lt, or, sql } from 'drizzle-orm';
import {
  type Asset,
  BASE_FEE,
  Operation,
  type Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { db } from '@/server/db/client';
import { deposits, fundPool, members } from '@/server/db/schema';
import {
  addr,
  assetFor,
  getContractId,
  getHorizonServer,
  getNetworkPassphrase,
  i128,
  prepareInvoke,
  submitSigned,
} from '@/server/stellar';
import { AppError } from '@/server/lib/http';
import { logger } from '@/server/lib/logger';
import { env } from '@/server/config/env';

const MIN_STROOPS = 1_000_000n; // 0.1 XLM

function addBig(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

const MEMBERS_DEFAULT_PAGE_SIZE = 50;
const MEMBERS_MAX_PAGE_SIZE = 200;

export interface MemberCursor {
  contributedStroops: string;
  joinedAt: Date;
  publicKey: string;
}

export function encodeMemberCursor(row: MemberCursor): string {
  return Buffer.from(
    `${row.contributedStroops}|${row.joinedAt.toISOString()}|${row.publicKey}`,
    'utf8',
  ).toString('base64url');
}

export function decodeMemberCursor(cursor: string): MemberCursor | undefined {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    return undefined;
  }
  const [contributedStroops, joinedAtRaw, publicKey] = decoded.split('|');
  if (!contributedStroops || !joinedAtRaw || !publicKey) return undefined;
  if (!/^-?\d+$/.test(contributedStroops)) return undefined;
  const joinedAt = new Date(joinedAtRaw);
  if (Number.isNaN(joinedAt.getTime())) return undefined;
  return { contributedStroops, joinedAt, publicKey };
}

export const fundService = {
  async getOrCreatePool() {
    const [pool] = await db.select().from(fundPool).limit(1);
    if (pool) return pool;
    const [created] = await db
      .insert(fundPool)
      .values({ treasuryAddress: getContractId() })
      .returning();
    return created!;
  },

  /**
   * Build an unsigned Soroban invocation of `contribute(member, amount)`. The
   * member signs it in Freighter; their signature also authorizes the inner XLM
   * SAC transfer into the fund contract.
   */
  async prepareContribution(publicKey: string, amountStroops: string) {
    if (!/^\d+$/.test(amountStroops) || BigInt(amountStroops) < MIN_STROOPS) {
      throw new AppError('INVALID_INPUT', 'Minimum contribution is 0.1 XLM', 400);
    }
    const xdr = await prepareInvoke(publicKey, 'contribute', addr(publicKey), i128(amountStroops));
    return { xdr };
  },

  /**
   * Submit the wallet-signed contribution to the Soroban RPC, poll until it
   * settles, and mirror the on-chain result (the member's new cumulative stake)
   * into the database.
   */
  async submitContribution(publicKey: string, signedXdr: string, amountStroops: string) {
    if (!/^\d+$/.test(amountStroops) || BigInt(amountStroops) < MIN_STROOPS) {
      throw new AppError('INVALID_INPUT', 'Minimum contribution is 0.1 XLM', 400);
    }
    const { hash: txHash } = await submitSigned(signedXdr);

    const [dep] = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(members)
        .where(eq(members.publicKey, publicKey))
        .limit(1);

      if (existing) {
        await tx
          .update(members)
          .set({
            contributedStroops: addBig(existing.contributedStroops, amountStroops),
            lastContributionAt: new Date(),
          })
          .where(eq(members.publicKey, publicKey));
      } else {
        await tx.insert(members).values({
          publicKey,
          contributedStroops: amountStroops,
          lastContributionAt: new Date(),
        });
      }

      const [pool] = await tx.select().from(fundPool).limit(1);
      let poolId: string;
      if (pool) {
        poolId = pool.id;
      } else {
        const [created] = await tx
          .insert(fundPool)
          .values({ treasuryAddress: getContractId() })
          .returning();
        poolId = created!.id;
      }

      const [sumRow] = await tx
        .select({ total: sql<string>`COALESCE(SUM(${deposits.amountStroops}), '0')` })
        .from(deposits);

      await tx
        .update(fundPool)
        .set({
          totalContributedStroops: addBig(sumRow?.total ?? '0', amountStroops),
          updatedAt: new Date(),
        })
        .where(eq(fundPool.id, poolId));

      const [created] = await tx
        .insert(deposits)
        .values({
          memberPublicKey: publicKey,
          amountStroops,
          assetCode: 'XLM',
          stellarTxHash: txHash,
        })
        .returning();

      return [created];
    });

    logger.info(`Contribution ${amountStroops} XLM from ${publicKey} via contract tx ${txHash}`);
    return { txHash, amountStroops, assetCode: 'XLM' as const, deposit: dep };
  },

  /** Build an unsigned changeTrust(USDC) so a member can opt into USDC (classic). */
  async prepareUsdcTrustline(publicKey: string) {
    const server = getHorizonServer();
    let account;
    try {
      account = await server.loadAccount(publicKey);
    } catch {
      throw new AppError(
        'INVALID_INPUT',
        env.STELLAR_NETWORK === 'public'
          ? 'Your wallet does not exist on mainnet yet. Send at least 1 XLM to it to activate it first.'
          : 'Your wallet is not funded on testnet yet. Fund it with the Friendbot first.',
        400,
      );
    }
    const usdc: Asset = assetFor('USDC');
    const already = account.balances.some(
      (b) =>
        b.asset_type !== 'native' &&
        'asset_code' in b &&
        b.asset_code === usdc.code &&
        b.asset_issuer === usdc.issuer,
    );
    if (already) throw new AppError('ALREADY_EXISTS', 'USDC is already enabled', 409);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(Operation.changeTrust({ asset: usdc }))
      .setTimeout(180)
      .build();
    return { xdr: tx.toXDR() };
  },

  /** Submit a wallet-signed changeTrust(USDC). */
  async submitUsdcTrustline(publicKey: string, signedXdr: string) {
    const server = getHorizonServer();
    const tx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase()) as Transaction;
    if (tx.source !== publicKey) {
      throw new AppError('FORBIDDEN', 'Transaction source mismatch', 403);
    }
    if (!tx.operations.some((o) => o.type === 'changeTrust')) {
      throw new AppError('INVALID_INPUT', 'Not a trustline transaction', 400);
    }
    try {
      const res = await server.submitTransaction(tx);
      return { txHash: res.hash };
    } catch (e: unknown) {
      logger.error(`Trustline submit failed: ${String(e)}`);
      throw new AppError('CONFLICT', 'Could not enable USDC. Please retry.', 409);
    }
  },

  async getPool() {
    return fundService.getOrCreatePool();
  },

  async getMembers(options: { cursor?: string; pageSize?: number } = {}) {
    const pageSize = Math.min(
      options.pageSize ?? MEMBERS_DEFAULT_PAGE_SIZE,
      MEMBERS_MAX_PAGE_SIZE,
    );
    const decodedCursor = options.cursor ? decodeMemberCursor(options.cursor) : undefined;
    const conditions = [];
    if (decodedCursor) {
      conditions.push(
        or(
          lt(members.contributedStroops, decodedCursor.contributedStroops),
          and(
            eq(members.contributedStroops, decodedCursor.contributedStroops),
            gt(members.joinedAt, decodedCursor.joinedAt),
          ),
          and(
            eq(members.contributedStroops, decodedCursor.contributedStroops),
            eq(members.joinedAt, decodedCursor.joinedAt),
            gt(members.publicKey, decodedCursor.publicKey),
          ),
        ),
      );
    }
    const rows = await db
      .select()
      .from(members)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(members.contributedStroops), members.joinedAt, members.publicKey)
      .limit(pageSize + 1);
    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? encodeMemberCursor(lastItem) : null;
    return { items, nextCursor };
  },

  async getRecentDeposits(limit?: number) {
    const capped = Math.min(limit ?? 20, 100);
    return db.select().from(deposits).orderBy(desc(deposits.createdAt)).limit(capped);
  },

  async getMemberByKey(publicKey: string) {
    const [m] = await db.select().from(members).where(eq(members.publicKey, publicKey)).limit(1);
    return m ?? null;
  },
};
