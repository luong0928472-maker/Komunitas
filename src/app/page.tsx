'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Coins, ScrollText, Sparkles, Vote } from 'lucide-react';
import { Wordmark } from '@/components/Logo';
import { ConnectButton } from '@/components/ConnectButton';
import { Button } from '@/components/ui/button';
import { api, type Stats } from '@/lib/api';
import { formatAmount } from '@/lib/utils';

const STEPS = [
  {
    icon: Coins,
    title: 'Pool the treasury',
    body: 'Members contribute XLM into one shared Soroban fund contract. Every contribution is a real on-chain call you can verify on Stellar.',
  },
  {
    icon: ScrollText,
    title: 'Propose a project',
    body: 'Anyone can put a project to the room — what it is, who receives the funds, and how much it needs from the pool.',
  },
  {
    icon: Vote,
    title: 'Vote, then release',
    body: 'The community votes. The moment a proposal carries a majority, the contract itself releases the payout on-chain — no middleman.',
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-civic">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Link href="/proposals" className="hidden text-sm font-medium text-stone-600 hover:text-ink sm:block">
            Proposals
          </Link>
          <Link href="/stats" className="hidden text-sm font-medium text-stone-600 hover:text-ink sm:block">
            Stats
          </Link>
          <ConnectButton />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800">
            <Sparkles className="h-3.5 w-3.5" />
            On-chain participatory budgeting
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            A treasury your
            <br />
            community actually steers.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
            komunitas turns a group wallet into a transparent, vote-driven fund. Pool money together,
            propose the projects that matter, and let the on-chain vote release the money.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard">
              <Button size="lg">
                Open the treasury <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/proposals">
              <Button size="lg" variant="outline">
                Browse proposals
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            No wallet needed to look around — connect only when you contribute, propose, or vote.
          </p>
        </div>

        {stats && (
          <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-200/80 sm:grid-cols-4">
            {[
              { k: 'In the treasury', v: `${formatAmount(stats.totalContributedStroops)} XLM` },
              { k: 'Members', v: stats.members },
              { k: 'Proposals', v: stats.proposals },
              { k: 'Funded on-chain', v: stats.fundedProposals },
            ].map((s) => (
              <div key={s.k} className="bg-white p-5">
                <dt className="text-xs uppercase tracking-wide text-stone-500">{s.k}</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
          How it works
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-stone-200/80 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="font-display text-sm font-semibold text-stone-400">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-200/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:px-6">
          <Wordmark />
          <span>Stellar APAC Hackathon · testnet · default asset XLM</span>
        </div>
      </footer>
    </div>
  );
}
