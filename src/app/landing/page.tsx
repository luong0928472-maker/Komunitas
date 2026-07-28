'use client';
import { Wordmark } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { type Stats, api } from '@/lib/api';
import { formatAmount } from '@/lib/utils';
import {
  ArrowRight,
  ArrowUpRight,
  Coins,
  FileCheck2,
  Globe,
  Landmark,
  ShieldCheck,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const CONTRACT_ID = 'CDNEHSQ5PWYC6AXNA4PIEAXCEUNUSVDAOKIVEBEHTRY2SEUJANSMWFVR';
const EXPLORER_URL = `https://stellar.expert/explorer/public/contract/${CONTRACT_ID}`;
const X_URL = 'https://x.com/KomunitasXLM';

const FLOW = [
  {
    icon: Coins,
    title: 'Contribute',
    body: 'Your XLM leaves your wallet and goes straight into the shared contract — a normal signed Stellar transaction, same as sending to a friend, except the receiver here is code everyone can inspect.',
  },
  {
    icon: FileCheck2,
    title: 'Propose',
    body: "Anyone in the group can open a proposal — what it's for, who gets paid, how much — and it sits on the ledger before anyone has voted on it.",
  },
  {
    icon: Vote,
    title: 'Vote',
    body: 'Members vote yes or no, one vote each. Every vote stays attached to the proposal for good, so nobody has to take our word for how the count went.',
  },
  {
    icon: ShieldCheck,
    title: 'Release',
    body: 'Once yes-votes clear a strict majority, the contract pays out right then. Nobody has to sign off, click approve, or remember to send it later.',
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
    body: 'Anyone who sends XLM in. The deposit becomes a stake the contract remembers for good.',
  },
  {
    icon: FileCheck2,
    title: 'Proposers',
    body: "Any contributor can name a recipient and an amount and put it up for a vote. There's no committee that signs off on the request first.",
  },
  {
    icon: Vote,
    title: 'Voters',
    body: 'Every contributor gets one vote per proposal, tallied on-chain where anyone can recount it themselves.',
  },
  {
    icon: Landmark,
    title: 'Treasury contract',
    body: 'komunitas-fund. The actual Soroban contract holding every stroop and enforcing whatever the vote decides.',
  },
  {
    icon: Globe,
    title: 'Stellar network',
    body: 'Where it all settles: mainnet, the same ledger real XLM lives on, not a testnet built for a demo.',
  },
  {
    icon: Wallet,
    title: 'Freighter',
    body: 'The wallet members use to sign each contribute, propose, and vote transaction. Nobody hands us their keys.',
  },
  {
    icon: Coins,
    title: 'Native XLM',
    body: 'The only asset the treasury touches, moved through the Stellar Asset Contract, so there is no trustline to set up first.',
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

const CONTRIBUTOR_NODE_POSITIONS = [
  { x: 26, y: 38 },
  { x: 26, y: 82 },
  { x: 26, y: 140 },
  { x: 26, y: 184 },
];
const TREASURY_NODE = { x: 165, y: 111, r: 28 };
const PROPOSAL_NODE = { x: 272, y: 111, r: 18 };

function FundFlowDiagram() {
  return (
    <svg
      viewBox="0 0 320 220"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="fund-flow-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="var(--color-accent-500)" />
        </marker>
      </defs>
      {CONTRIBUTOR_NODE_POSITIONS.map((node) => (
        <path
          key={`${node.x}-${node.y}`}
          d={`M${node.x},${node.y} C ${node.x + 70},${node.y} ${TREASURY_NODE.x - 30},${TREASURY_NODE.y} ${TREASURY_NODE.x - TREASURY_NODE.r},${TREASURY_NODE.y}`}
          fill="none"
          stroke="var(--color-brand-400)"
          strokeWidth="2"
          strokeDasharray="4 5"
          className="animate-flow-dash"
        />
      ))}
      {CONTRIBUTOR_NODE_POSITIONS.map((node) => (
        <circle
          key={`${node.x}-${node.y}-dot`}
          cx={node.x}
          cy={node.y}
          r="7"
          fill="var(--color-brand-500)"
        />
      ))}
      <circle
        cx={TREASURY_NODE.x}
        cy={TREASURY_NODE.y}
        r={TREASURY_NODE.r}
        fill="var(--color-brand-700)"
        stroke="var(--color-paper)"
        strokeWidth="3"
      />
      <line
        x1={TREASURY_NODE.x + TREASURY_NODE.r}
        y1={TREASURY_NODE.y}
        x2={PROPOSAL_NODE.x - PROPOSAL_NODE.r - 4}
        y2={PROPOSAL_NODE.y}
        stroke="var(--color-accent-500)"
        strokeWidth="3"
        markerEnd="url(#fund-flow-arrow)"
      />
      <circle
        cx={PROPOSAL_NODE.x}
        cy={PROPOSAL_NODE.y}
        r={PROPOSAL_NODE.r}
        fill="var(--color-accent-500)"
      />
    </svg>
  );
}

function LedgerRow({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="flex items-baseline gap-2 py-2.5">
      <span className="whitespace-nowrap text-sm text-stone-600">{label}</span>
      <span
        className="flex-1 border-b border-dotted border-stone-300 translate-y-[-3px]"
        aria-hidden
      />
      <span className="font-mono text-sm font-semibold tabular-nums text-ink">
        {loading ? '···' : value}
      </span>
    </div>
  );
}

export default function KomunitasLanding() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const loading = !stats;

  return (
    <div className="min-h-screen bg-civic">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-5">
          <Link
            href="/proposals"
            className="hidden text-sm font-medium text-stone-600 hover:text-ink sm:block"
          >
            Proposals
          </Link>
          <Link
            href="/stats"
            className="hidden text-sm font-medium text-stone-600 hover:text-ink sm:block"
          >
            Stats
          </Link>
          <Link href="/dashboard">
            <Button size="sm" variant="outline">
              Open the app
            </Button>
          </Link>
        </nav>
      </header>

      <nav className="border-y border-stone-200/70 bg-white/60 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-2.5 text-sm font-medium text-stone-600 sm:px-6">
          {ANCHOR_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="whitespace-nowrap hover:text-brand-800">
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
        <aside className="hidden lg:sticky lg:top-8 lg:block lg:h-fit lg:pl-6">
          <p className="font-mono text-xs uppercase tracking-widest text-stone-400">Contents</p>
          <ul className="mt-4 space-y-3 border-l border-stone-200 pl-4">
            {ANCHOR_LINKS.map((link, i) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="group flex items-baseline gap-2 text-sm text-stone-600 hover:text-brand-800"
                >
                  <span className="font-mono text-xs text-stone-400 group-hover:text-brand-700">
                    §0{i + 1}
                  </span>
                  <span>{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          <section id="intro" className="scroll-mt-8 px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
            <div className="border-t border-stone-300 pt-2 font-mono text-xs uppercase tracking-widest text-stone-500">
              Komunitas — Community Treasury Charter · Stellar mainnet
            </div>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              A ledger nobody
              <br />
              can quietly edit.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">
              komunitas swaps the treasurer for a contract. Every stroop of XLM that comes in, every
              proposal that goes up, every vote that gets cast — it all lands on one public ledger,
              not a spreadsheet someone could quietly fix later.
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

            <div className="bg-civic mt-12 border-y border-stone-200/70 py-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-widest text-brand-700">
                  Statement of accounts (live)
                </span>
                <span className="text-xs text-stone-400">live</span>
              </div>
              <div className="mt-3 divide-y divide-stone-100">
                <LedgerRow
                  label="In the treasury"
                  value={`${formatAmount(stats?.totalContributedStroops ?? '0')} XLM`}
                  loading={loading}
                />
                <LedgerRow
                  label="Released to proposals"
                  value={`${formatAmount(stats?.totalReleasedStroops ?? '0')} XLM`}
                  loading={loading}
                />
                <LedgerRow label="Members" value={`${stats?.members ?? 0}`} loading={loading} />
                <LedgerRow
                  label="Proposals raised"
                  value={`${stats?.proposals ?? 0}`}
                  loading={loading}
                />
                <LedgerRow
                  label="Funded on-chain"
                  value={`${stats?.fundedProposals ?? 0}`}
                  loading={loading}
                />
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

          <section className="px-4 pb-24 sm:px-6">
            <div className="flex items-start justify-between gap-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
                How the money moves
              </h2>
              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 sm:flex">
                <Coins className="h-7 w-7 text-brand-700" />
              </div>
            </div>
            <div className="relative mt-8">
              <div
                className="absolute left-5 top-2 bottom-2 hidden w-px bg-stone-200 sm:block"
                aria-hidden
              />
              <ol className="space-y-8">
                {FLOW.map((step, i) => (
                  <li key={step.title} className="relative flex gap-5 sm:pl-0">
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-sm font-semibold text-stone-400">
                          0{i + 1}
                        </span>
                        <h3 className="font-display text-lg font-semibold text-ink">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-600">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="ecosystem" className="scroll-mt-8 px-4 pb-24 sm:px-6">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
              Ecosystem
            </h2>
            <p className="mt-3 max-w-2xl text-stone-600">
              komunitas is one community-fund contract — not a suite of tokens or a stack of
              integrations. Here is everyone and everything that actually touches it.
            </p>
            <div className="mt-8 grid gap-8 lg:grid-cols-[7fr_5fr] lg:items-start">
              <div className="relative lg:sticky lg:top-24">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-50 sm:aspect-[16/11]">
                  <div className="absolute inset-0 bg-civic" aria-hidden />
                  <FundFlowDiagram />
                  <span className="absolute left-6 top-6 font-display text-xs font-semibold uppercase tracking-widest text-brand-800/70 sm:left-8 sm:top-8">
                    Contributors → Treasury → Funded proposal
                  </span>
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <p className="font-display text-5xl font-bold text-white sm:text-6xl">
                      {stats?.members ?? '···'}
                    </p>
                    <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/85">
                      people have put real XLM into this treasury. Every one of them gets a vote,
                      not just a seat in the room.
                    </p>
                  </div>
                </div>
              </div>
              <ul className="divide-y divide-stone-200/70 border-y border-stone-200/70">
                {ECOSYSTEM.map((item, i) => (
                  <li key={item.title} className="flex gap-4 py-4">
                    <span className="pt-0.5 font-display text-xs font-semibold text-stone-400">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold text-ink">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="roadmap" className="scroll-mt-8 px-4 pb-24 sm:px-6">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
              Roadmap
            </h2>
            <p className="mt-3 max-w-2xl text-stone-600">
              What's already live, and where we're taking it next.
            </p>

            <div className="mt-8">
              <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-stone-500">
                Ratified
              </h3>
              <ul className="mt-4 divide-y divide-stone-200/70 border-y border-stone-200/70">
                {ROADMAP_LIVE.map((item, i) => (
                  <li key={item} className="flex items-baseline gap-3 py-3">
                    <span className="w-10 shrink-0 font-mono text-xs text-stone-400">
                      A.0{i + 1}
                    </span>
                    <span className="text-sm text-stone-700">{item}</span>
                    <span
                      className="flex-1 border-b border-dotted border-stone-300 translate-y-[-3px]"
                      aria-hidden
                    />
                    <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-brand-700">
                      in force
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 border-l-2 border-dashed border-stone-300 pl-5">
              <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-stone-500">
                Proposed amendments
              </h3>
              <ul className="mt-4 divide-y divide-stone-200/70">
                {ROADMAP_NEXT.map((item, i) => (
                  <li key={item} className="flex items-baseline gap-3 py-3">
                    <span className="w-10 shrink-0 font-mono text-xs text-stone-400">
                      B.0{i + 1}
                    </span>
                    <span className="text-sm text-stone-500">{item}</span>
                    <span
                      className="flex-1 border-b border-dotted border-stone-300 translate-y-[-3px]"
                      aria-hidden
                    />
                    <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-stone-400">
                      proposed
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-stone-400">
                Nothing here is scheduled. It can change.
              </p>
            </div>
          </section>

          <section id="how-it-works" className="scroll-mt-8 px-4 pb-24 sm:px-6">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
              How it works
            </h2>
            <p className="mt-3 max-w-2xl text-stone-600">
              The mechanics, straight from the deployed contract — komunitas-fund.
            </p>
            <div className="mt-8 space-y-8">
              <div className="flex gap-4">
                <span className="w-8 shrink-0 font-display text-sm font-semibold text-stone-400">
                  §1
                </span>
                <div className="border-l-2 border-stone-200 pl-4">
                  <span className="font-mono text-sm font-semibold text-brand-800">
                    contribute(member, amount)
                  </span>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
                    Pulls native XLM from the member's wallet into the contract's own custody via
                    the Stellar Asset Contract — no trustline needed. Tracks each member's
                    cumulative stake and counts them as a member the first time they contribute.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="w-8 shrink-0 font-display text-sm font-semibold text-stone-400">
                  §2
                </span>
                <div className="border-l-2 border-stone-200 pl-4">
                  <span className="font-mono text-sm font-semibold text-brand-800">
                    create_proposal(proposer, recipient, amount)
                  </span>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
                    Anyone can open a request naming a recipient and an amount. It starts Active —
                    recorded on-chain before a single vote is cast.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="w-8 shrink-0 font-display text-sm font-semibold text-stone-400">
                  §3
                </span>
                <div className="border-l-2 border-stone-200 pl-4">
                  <span className="font-mono text-sm font-semibold text-brand-800">
                    vote(voter, proposal_id, in_favor)
                  </span>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
                    One vote per member per proposal, enforced on-chain. The instant yes-votes cross
                    a strict majority of members (
                    <code className="font-mono text-brand-800">2 * yes &gt; member_count</code>
                    ), the contract disburses the grant to the recipient in that same transaction
                    and the proposal turns Funded. If the majority passes but the treasury is short,
                    it turns Passed and waits.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="w-8 shrink-0 font-display text-sm font-semibold text-stone-400">
                  §4
                </span>
                <div className="border-l-2 border-stone-200 pl-4">
                  <span className="font-mono text-sm font-semibold text-brand-800">
                    disburse(proposal_id)
                  </span>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
                    An admin-gated fallback that completes a Passed proposal once the treasury holds
                    enough — the same payout logic the automatic release uses, guarded against
                    double-pay.
                  </p>
                </div>
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
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative rounded-2xl border border-stone-200/80 bg-white p-8 sm:p-10">
          <div className="pointer-events-none absolute -top-5 right-8 hidden -rotate-3 sm:block">
            <div className="h-24 w-32 rounded-md border-4 border-white bg-[radial-gradient(circle,var(--color-brand-300)_1.5px,transparent_1.5px)] bg-[length:10px_10px] shadow-md ring-1 ring-stone-200" />
          </div>
          <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                Don't take our word for it.
              </h2>
              <p className="mt-2 max-w-lg text-stone-600">
                It's live on Stellar mainnet. Go read every contribution, proposal, vote, and payout
                straight off the chain yourself.
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
