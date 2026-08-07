'use client';
import Link from 'next/link';
import { Clock, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { StatusBadge } from './ui/badge';
import { type Proposal } from '@/lib/api';
import { formatAmount, timeUntil, truncateAddress, votePercentage } from '@/lib/utils';

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const yp = votePercentage(proposal.votesYes, proposal.totalVoters);
  const total = Number(proposal.totalVoters);

  return (
    <Link href={`/proposals/${proposal.id}`} className="group block h-full">
      <Card className="flex h-full flex-col transition-shadow group-hover:shadow-md">
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <StatusBadge status={proposal.status} />
            {proposal.status === 'active' && (
              <span className="flex items-center gap-1 text-xs text-stone-500">
                <Clock className="h-3 w-3" /> {timeUntil(proposal.votingDeadline)}
              </span>
            )}
          </div>
          <h3 className="font-display text-base font-semibold leading-snug text-ink line-clamp-2">
            {proposal.title}
          </h3>
          <p className="mt-1 text-xs text-stone-500">by {truncateAddress(proposal.proposerPublicKey, 5)}</p>
          <p className="mt-3 line-clamp-2 text-sm text-stone-600">{proposal.description}</p>

          <div className="mt-auto pt-4">
            <p className="font-display text-xl font-bold text-brand-700">
              {formatAmount(proposal.requestStroops)}{' '}
              <span className="text-sm font-medium text-stone-400">{proposal.assetCode}</span>
            </p>
            {total > 0 ? (
              <>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <ThumbsUp className="h-3 w-3" /> {proposal.votesYes}
                  </span>
                  <span className="flex items-center gap-1 text-rose-500">
                    {proposal.votesNo} <ThumbsDown className="h-3 w-3" />
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${yp}%` }} />
                </div>
                <p className="mt-1 text-xs text-stone-400">{total} vote{total === 1 ? '' : 's'} · {yp}% in favour</p>
              </>
            ) : (
              <p className="mt-3 text-xs text-stone-400">No votes yet — be the first to weigh in.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
