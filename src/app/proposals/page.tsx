'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProposalCard } from '@/components/ProposalCard';
import { api, type Proposal } from '@/lib/api';

type Filter = 'all' | 'active' | 'funded' | 'rejected';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Voting open' },
  { key: 'funded', label: 'Funded' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.proposals
      .list(filter === 'all' ? undefined : filter)
      .then(setProposals)
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Proposals</h1>
          <p className="mt-1 text-stone-600">
            Projects asking the community treasury for funding. Connect to vote.
          </p>
        </div>
        <Link href="/proposals/new">
          <Button>
            <PlusCircle className="h-4 w-4" /> Propose a project
          </Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-brand-700 text-white'
                : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-stone-200/70" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-stone-300 py-16 text-center">
          <ScrollText className="h-12 w-12 text-stone-300" />
          <p className="mt-4 font-display text-lg font-semibold text-ink">No proposals here yet</p>
          <p className="mt-1 text-sm text-stone-500">
            {filter === 'all'
              ? 'Put the first project to the community.'
              : 'Nothing matches this filter right now.'}
          </p>
          <Link href="/proposals/new" className="mt-5">
            <Button>Propose a project</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} />
          ))}
        </div>
      )}
    </div>
  );
}
