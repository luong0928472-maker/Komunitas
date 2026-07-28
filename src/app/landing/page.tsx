'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Compass,
  FileCheck2,
  Globe,
  Landmark,
  ShieldCheck,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import { Wordmark } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { api, type Stats } from '@/lib/api';
import { formatAmount } from '@/lib/utils';

const CONTRACT_ID = 'CDNEHSQ5PWYC6AXNA4PIEAXCEUNUSVDAOKIVEBEHTRY2SEUJANSMWFVR';
const EXPLORER_URL = `https://stellar.expert/explorer/public/contract/${CONTRACT_ID}`;
const X_URL = 'https://x.com/KomunitasXLM';

const FLOW = [
  {
    icon: Coins,
    title: 'Contribute',
    body: 'XLM leaves your wallet and lands in one shared contract. The transfer is a signed Stellar transaction, not a transfer to a person.',
  },
  {
    icon: FileCheck2,
    title: 'Propose',
    body: 'Anyone in the room can open a request: what it funds, who receives it, how much. It goes on the ledger before a single vote is cast.',
  },
  {
    icon: Vote,
    title: 'Vote',
    body: 'Members vote yes or no. Every vote is recorded against the proposal — no anonymous tally, no closed-door count.',
  },
  {
    icon: ShieldCheck,
    title: 'Release',
    body: 'The moment yes votes cross a strict majority, the contract disburses itself. No treasurer approval step exists to skip or stall.',
  },
];

const ANCHOR_LINKS = [
  { href: '#intro', label: 'Intro' },
  { href: '#ecosystem', label: 'Ecosystem' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '#how-it-works', label: 'How it works' },
];

const ECOSYSTEM = [
  {
    icon: Users,
    title: 'Contributors',
    body: 'Members who send XLM into the shared treasury. Every deposit becomes their on-chain stake.',
  },
  {
    icon: FileCheck2,
    title: 'Proposers',
    body: 'Any member can open a funding request naming a recipient and an amount — no gatekeeper approval.',
  },
  {
    icon: Vote,
    title: 'Voters',
    body: 'Members who decide. One vote per member per proposal, tallied on-chain, no closed count.',
  },
  {
    icon: Landmark,
    title: 'Treasury contract',
    body: 'komunitas-fund, the Soroban contract that holds every stroop and enforces the vote outcome itself.',
  },
  {
    icon: Globe,
    title: 'Stellar network',
    body: 'The public ledger every contribution, proposal, vote, and release settles on — mainnet, not a sidechain.',
  },
  {
    icon: Wallet,
    title: 'Freighter',
    body: 'The wallet extension members sign contribute, propose, and vote transactions with. No custodial signing.',
  },
  {
    icon: Coins,
    title: 'Native XLM',
    body: 'The one asset the treasury holds and disburses, moved via the Stellar Asset Contract — no trustline needed.',
  },
];

const ROADMAP_LIVE = [
  'Contribute XLM into the shared treasury contract',
  'Open a funding proposal naming a recipient and amount',
  'Vote yes or no, one vote per member per proposal',
  'Automatic on-chain release the moment a strict majority passes',
  'Full transparency — every entry readable straight from the contract',
  'Live on Stellar mainnet',
];

const ROADMAP_NEXT = [
  'More granular proposal categories',
  'Delegated voting for members who want to assign their vote',
  'Independent contract audit',
  'Additional language support beyond English',
];

function LedgerRow({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="flex items-baseline gap-2 py-2.5">
      <span className="whitespace-nowrap text-sm text-stone-600">{label}</span>
      <span className="flex-1 border-b border-dotted border-stone-300 translate-y-[-3px]" aria-hidden />
      <span className="font-mono text-sm font-semibold tabular-nums text-ink">
        {loading ? '···' : value}
      </span>
    </div>
  );
}

export default function KomunitasLanding() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  const loading = !stats;

  return (
    <div className="min-h-screen bg-civic">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-5">
          <Link href="/proposals" className="hidden text-sm font-medium text-stone-600 hover:text-ink sm:block">
            Proposals
          </Link>
          <Link href="/stats" className="hidden text-sm font-medium text-stone-600 hover:text-ink sm:block">
            Stats
          </Link>
          <Link href="/dashboard">
            <Button size="sm" variant="outline">
              Open the app
            </Button>
          </Link>
        </nav>
      </header>

      <nav className="border-y border-stone-200/70 bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-2.5 text-sm font-medium text-stone-600 sm:px-6">
          {ANCHOR_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="whitespace-nowrap hover:text-brand-800">
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="intro" className="mx-auto grid max-w-6xl scroll-mt-14 gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800">
            Stellar mainnet · every entry public
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            A ledger nobody
            <br />
            can quietly edit.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-stone-600">
            komunitas replaces the treasurer with a contract. Every stroop of XLM that goes in,
            every proposal that goes up, every vote that gets cast, every payout that goes out —
            it's all one open ledger, not a spreadsheet someone could edit after the fact.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard">
              <Button size="lg">
                View the treasury <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/proposals">
              <Button size="lg" variant="outline">
                Browse proposals
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Look around with no wallet. Connect only once you contribute, propose, or vote.
          </p>
        </div>

        <div className="relative rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <div
            className="pointer-events-none absolute inset-x-0 -top-2 h-4 bg-[radial-gradient(circle,var(--color-paper)_2.5px,transparent_2.5px)] bg-[length:14px_14px]"
            aria-hidden
          />
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-semibold uppercase tracking-widest text-brand-700">
              The open ledger
            </span>
            <span className="text-xs text-stone-400">live</span>
          </div>
          <div className="mt-3 divide-y divide-stone-100">
            <LedgerRow label="In the treasury" value={`${formatAmount(stats?.totalContributedStroops ?? '0')} XLM`} loading={loading} />
            <LedgerRow label="Released to proposals" value={`${formatAmount(stats?.totalReleasedStroops ?? '0')} XLM`} loading={loading} />
            <LedgerRow label="Members" value={`${stats?.members ?? 0}`} loading={loading} />
            <LedgerRow label="Proposals raised" value={`${stats?.proposals ?? 0}`} loading={loading} />
            <LedgerRow label="Funded on-chain" value={`${stats?.fundedProposals ?? 0}`} loading={loading} />
          </div>
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified on Stellar mainnet
            </span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
          How the money moves
        </h2>
        <div className="relative mt-8">
          <div className="absolute left-5 top-2 bottom-2 hidden w-px bg-stone-200 sm:block" aria-hidden />
          <ol className="space-y-8">
            {FLOW.map((step, i) => (
              <li key={step.title} className="relative flex gap-5 sm:pl-0">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm font-semibold text-stone-400">0{i + 1}</span>
                    <h3 className="font-display text-lg font-semibold text-ink">{step.title}</h3>
                  </div>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="ecosystem" className="mx-auto max-w-6xl scroll-mt-14 px-4 pb-24 sm:px-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
          Ecosystem
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          komunitas is one community-fund contract, not a multi-token protocol. Here is every
          real actor that touches it — no partners, no invented integrations.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ECOSYSTEM.map((item) => (
            <div key={item.title} className="rounded-2xl border border-stone-200/80 bg-white p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roadmap" className="mx-auto max-w-6xl scroll-mt-14 px-4 pb-24 sm:px-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
          Roadmap
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          What's actually shipped today, and the direction we're heading — not dates, not
          promises.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-stone-500">
              Live now
            </h3>
            <ul className="mt-4 space-y-3">
              {ROADMAP_LIVE.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-stone-500">
              What's next
            </h3>
            <ul className="mt-4 space-y-3">
              {ROADMAP_NEXT.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-stone-600">
                  <Compass className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-stone-400">Direction, not a commitment or timeline.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-14 px-4 pb-24 sm:px-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
          How it works
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          The mechanics, straight from the deployed contract — komunitas-fund.
        </p>
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
            <span className="font-mono text-sm font-semibold text-brand-800">
              contribute(member, amount)
            </span>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Pulls native XLM from the member's wallet into the contract's own custody via the
              Stellar Asset Contract — no trustline needed. Tracks each member's cumulative
              stake and counts them as a member the first time they contribute.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
            <span className="font-mono text-sm font-semibold text-brand-800">
              create_proposal(proposer, recipient, amount)
            </span>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Anyone can open a request naming a recipient and an amount. It starts Active —
              recorded on-chain before a single vote is cast.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
            <span className="font-mono text-sm font-semibold text-brand-800">
              vote(voter, proposal_id, in_favor)
            </span>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              One vote per member per proposal, enforced on-chain. The instant yes-votes cross a
              strict majority of members (<code className="font-mono text-brand-800">2 * yes &gt; member_count</code>),
              the contract disburses the grant to the recipient in that same transaction and the
              proposal turns Funded. If the majority passes but the treasury is short, it turns
              Passed and waits.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
            <span className="font-mono text-sm font-semibold text-brand-800">disburse(proposal_id)</span>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              An admin-gated fallback that completes a Passed proposal once the treasury holds
              enough — the same payout logic the automatic release uses, guarded against
              double-pay.
            </p>
          </div>
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-2 font-mono text-xs text-stone-700 hover:bg-stone-100"
          >
            View komunitas-fund on Stellar Expert
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-brand-700" />
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-2xl border border-stone-200/80 bg-white p-8 sm:p-10">
          <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                Don't take our word for it.
              </h2>
              <p className="mt-2 max-w-lg text-stone-600">
                The contract is live on Stellar mainnet. Read every contribution, proposal, vote,
                and release directly from the chain.
              </p>
              <a
                href={EXPLORER_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-2 font-mono text-xs text-stone-700 hover:bg-stone-100"
              >
                {CONTRACT_ID}
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-brand-700" />
              </a>
            </div>
            <Link href="/dashboard" className="justify-self-start sm:justify-self-end">
              <Button size="lg">
                Join the treasury <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-4">
            <a href={X_URL} target="_blank" rel="noreferrer" className="hover:text-ink">
              @KomunitasXLM
            </a>
            <span>Stellar mainnet · default asset XLM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
