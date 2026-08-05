'use client';
import { useEffect, useState } from 'react';
import {
  Coins,
  HandCoins,
  ScrollText,
  Sparkles,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { api, type Stats } from '@/lib/api';
import { formatAmount } from '@/lib/utils';

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { icon: Wallet, label: 'Unique wallets', value: stats.uniqueWallets, hint: 'distinct wallets that signed in' },
        { icon: Sparkles, label: 'Wallet sign-ins', value: stats.logins, hint: 'SEP-10 sessions created' },
        { icon: Users, label: 'Contributors', value: stats.members, hint: 'wallets that funded the pool' },
        { icon: HandCoins, label: 'Contributions', value: stats.contributions, hint: 'on-chain payments in' },
        { icon: ScrollText, label: 'Proposals', value: stats.proposals, hint: `${stats.activeProposals} open now` },
        { icon: Vote, label: 'Votes cast', value: stats.votes, hint: 'across all proposals' },
        { icon: Coins, label: 'Pooled', value: `${formatAmount(stats.totalContributedStroops)} XLM`, hint: 'total contributed' },
        { icon: Coins, label: 'Released', value: `${formatAmount(stats.totalReleasedStroops)} XLM`, hint: `${stats.fundedProposals} projects funded` },
      ]
    : [];

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Live interaction stats</h1>
        <p className="mt-1 text-stone-600">
          Real activity on komunitas — wallet sign-ins, contributions, proposals, and votes. Treasury
          and demo keys are excluded so these reflect genuine community use.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-200/70" />
          ))}
        </div>
      ) : !stats ? (
        <p className="mt-8 text-stone-500">Stats are unavailable right now.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100">
                  <c.icon className="h-5 w-5 text-brand-700" />
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-ink">{c.value}</p>
                <p className="text-sm font-medium text-stone-600">{c.label}</p>
                <p className="mt-0.5 text-xs text-stone-400">{c.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
