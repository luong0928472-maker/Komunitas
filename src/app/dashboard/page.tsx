'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Coins,
  PlusCircle,
  ScrollText,
  Users,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/components/WalletProvider';
import {
  api,
  type Member,
  type Pool,
  type Proposal,
  type Stats,
} from '@/lib/api';
import { accountUrl, formatAmount, truncateAddress, votePercentage } from '@/lib/utils';

export default function DashboardPage() {
  const { publicKey, connect, connecting } = useWallet();
  const [pool, setPool] = useState<Pool | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.fund.pool(), api.stats(), api.proposals.list(), api.fund.members()])
      .then(([p, s, pr, m]) => {
        setPool(p);
        setStats(s);
        setProposals(pr.slice(0, 5));
        setMembers(m.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const available =
    pool ? BigInt(pool.totalContributedStroops) - BigInt(pool.totalReleasedStroops) : 0n;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-stone-200/70" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-200/70" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Community treasury</h1>
        <p className="mt-1 text-stone-600">
          One shared pool. The room decides where it goes.
        </p>
      </div>

      {!publicKey && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-brand-700" />
            <p className="text-sm text-brand-900">
              Connect your Freighter wallet to contribute, propose a project, or vote.
            </p>
          </div>
          <Button size="sm" onClick={() => connect()} loading={connecting}>
            Connect wallet
          </Button>
        </div>
      )}

      {/* Treasury hero */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5">
          <div className="bg-brand-700 p-6 text-white md:col-span-3">
            <p className="text-sm font-medium text-brand-200">Available to fund projects</p>
            <p className="mt-2 font-display text-5xl font-bold tracking-tight">
              {formatAmount(available.toString())}
              <span className="ml-2 text-2xl text-brand-200">XLM</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/contribute">
                <Button variant="accent" size="md">
                  <Coins className="h-4 w-4" /> Contribute
                </Button>
              </Link>
              <Link href="/proposals/new">
                <Button
                  size="md"
                  className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  <PlusCircle className="h-4 w-4" /> Propose a project
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 md:col-span-2">
            <Metric label="Total pooled" value={`${formatAmount(pool?.totalContributedStroops ?? '0')}`} unit="XLM" />
            <Metric label="Released" value={`${formatAmount(pool?.totalReleasedStroops ?? '0')}`} unit="XLM" />
            <Metric label="Members" value={String(stats?.members ?? 0)} />
            <Metric label="Funded projects" value={String(stats?.fundedProposals ?? 0)} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent proposals */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Recent proposals</h2>
            <Link href="/proposals" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {proposals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <ScrollText className="h-9 w-9 text-stone-300" />
                <div>
                  <p className="font-medium text-ink">No proposals yet</p>
                  <p className="mt-1 text-sm text-stone-500">Be the first to put a project to the room.</p>
                </div>
                <Link href="/proposals/new">
                  <Button size="sm">Propose a project</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => {
                const yp = votePercentage(p.votesYes, p.totalVoters);
                return (
                  <Link key={p.id} href={`/proposals/${p.id}`}>
                    <Card className="transition-shadow hover:shadow-md">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <StatusBadge status={p.status} />
                          </div>
                          <p className="truncate font-medium text-ink">{p.title}</p>
                          <p className="mt-0.5 text-sm text-stone-500">
                            {formatAmount(p.requestStroops)} {p.assetCode} requested
                          </p>
                          {Number(p.totalVoters) > 0 && (
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${yp}%` }} />
                            </div>
                          )}
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-stone-400" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Contributors */}
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Contributors</h2>
          <Card>
            <CardContent className="p-4">
              {members.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users className="h-8 w-8 text-stone-300" />
                  <p className="text-sm text-stone-500">No contributors yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {members.map((m, i) => (
                    <li key={m.publicKey} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {i + 1}
                      </span>
                      <a
                        href={accountUrl(m.publicKey)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 font-mono text-sm text-ink hover:text-brand-700"
                      >
                        {truncateAddress(m.publicKey, 6)}
                        {m.publicKey === publicKey && (
                          <span className="ml-2 rounded bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-600">
                            you
                          </span>
                        )}
                      </a>
                      <span className="text-sm font-medium text-stone-600">
                        {formatAmount(m.contributedStroops)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/dashboard/contribute" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full">
                  <Coins className="h-4 w-4" /> Contribute to the pool
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="border-b border-l border-stone-200/80 p-5 first:border-l-0">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-stone-400">{unit}</span>}
      </p>
    </div>
  );
}
