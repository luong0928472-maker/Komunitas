import { type NextRequest } from 'next/server';
import { notInArray, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { deposits, fundPool, members, proposals, sessions, votes } from '@/server/db/schema';
import { env, excludedStatsKeys } from '@/server/config/env';
import { ok, fromError } from '@/server/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const excluded = [...excludedStatsKeys];
    const notExcluded = (col: Parameters<typeof notInArray>[0]) =>
      excluded.length > 0 ? notInArray(col, excluded) : undefined;

    // Run sequentially: the Supabase session-mode pooler has a small client cap,
    // so we avoid opening several connections at once per request.
    const sessionAgg = await db
      .select({
        logins: sql<number>`count(*)::int`,
        wallets: sql<number>`count(distinct ${sessions.publicKey})::int`,
      })
      .from(sessions)
      .where(notExcluded(sessions.publicKey));
    const memberCount = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(members)
      .where(notExcluded(members.publicKey));
    const contributionAgg = await db
      .select({
        n: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${deposits.amountStroops}::numeric), 0)::text`,
      })
      .from(deposits)
      .where(notExcluded(deposits.memberPublicKey));
    const voteCount = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(votes)
      .where(notExcluded(votes.voterPublicKey));
    const proposalRows = await db.select({ status: proposals.status }).from(proposals);
    const pool = await db.select().from(fundPool).limit(1);

    const totalContributedStroops =
      contributionAgg[0]?.total && contributionAgg[0].total !== '0'
        ? contributionAgg[0].total
        : pool[0]?.totalContributedStroops ?? '0';

    const totalReleasedStr =
      pool[0] && excluded.includes(pool[0].treasuryAddress ?? env.TREASURY_ADDRESS)
        ? '0'
        : (pool[0]?.totalReleasedStroops ?? '0');

    return ok({
      uniqueWallets: sessionAgg[0]?.wallets ?? 0,
      logins: sessionAgg[0]?.logins ?? 0,
      members: memberCount[0]?.n ?? 0,
      contributions: contributionAgg[0]?.n ?? 0,
      votes: voteCount[0]?.n ?? 0,
      proposals: proposalRows.length,
      fundedProposals: proposalRows.filter((p) => p.status === 'funded').length,
      activeProposals: proposalRows.filter((p) => p.status === 'active').length,
      totalContributedStroops,
      totalReleasedStroops: totalReleasedStr,
    });
  } catch (e) {
    return fromError(e);
  }
}
