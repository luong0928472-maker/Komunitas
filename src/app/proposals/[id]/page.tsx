'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  PartyPopper,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/components/WalletProvider';
import { signXdr } from '@/lib/wallet';
import { api, type Proposal, type Vote } from '@/lib/api';
import { accountUrl, formatAmount, timeUntil, truncateAddress, txUrl, votePercentage } from '@/lib/utils';

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { publicKey, connect, connecting } = useWallet();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.proposals.get(id);
      setProposal(res.proposal);
      setVotes(res.votes);
    } catch {
      router.push('/proposals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function castVote(inFavor: boolean) {
    setVoting(true);
    setError(null);
    try {
      // Phase 1: build the on-chain vote call.
      const { xdr } = await api.proposals.votePrepare(id, inFavor);
      // Phase 2: sign in Freighter and submit; a strict majority auto-disburses.
      const signed = await signXdr(xdr);
      const { proposal: updated } = await api.proposals.voteSubmit(id, signed, inFavor);
      setProposal(updated);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vote failed');
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />;
  }
  if (!proposal) return null;

  const yp = votePercentage(proposal.votesYes, proposal.totalVoters);
  const np = votePercentage(proposal.votesNo, proposal.totalVoters);
  const isActive = proposal.status === 'active';
  const alreadyVoted = !!publicKey && votes.some((v) => v.voterPublicKey === publicKey);

  return (
    <div>
      <Link href="/proposals" className="mb-6 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All proposals
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-2xl leading-tight">{proposal.title}</CardTitle>
                <StatusBadge status={proposal.status} />
              </div>
              <p className="mt-2 text-sm text-stone-500">
                Proposed by{' '}
                <a href={accountUrl(proposal.proposerPublicKey)} target="_blank" rel="noreferrer" className="font-mono hover:text-brand-700">
                  {truncateAddress(proposal.proposerPublicKey, 5)}
                </a>
              </p>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-relaxed text-stone-700">{proposal.description}</p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-brand-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-brand-600">Requested</p>
                  <p className="mt-1 font-display text-2xl font-bold text-brand-800">
                    {formatAmount(proposal.requestStroops)} {proposal.assetCode}
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Recipient</p>
                  <a
                    href={accountUrl(proposal.recipientAddress)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all font-mono text-sm text-stone-700 hover:text-brand-700"
                  >
                    {truncateAddress(proposal.recipientAddress, 8)}
                  </a>
                  {isActive && <p className="mt-1 text-xs text-stone-400">{timeUntil(proposal.votingDeadline)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Funded — the on-chain payout */}
          {proposal.status === 'funded' && proposal.releaseTxHash && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <PartyPopper className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-emerald-900">The vote carried — funds released</h3>
                    <p className="text-sm text-emerald-700">
                      The treasury paid {formatAmount(proposal.requestStroops)} {proposal.assetCode} on-chain.
                    </p>
                  </div>
                </div>
                <a
                  href={txUrl(proposal.releaseTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 font-mono text-xs text-stone-600 hover:text-brand-700"
                >
                  <span className="break-all">{proposal.releaseTxHash}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </CardContent>
            </Card>
          )}

          {proposal.status === 'passed' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This proposal passed the vote. Funds will be released once the treasury holds enough{' '}
              {proposal.assetCode}.
            </div>
          )}

          {/* Vote */}
          {isActive && (
            <Card>
              <CardHeader>
                <CardTitle>Cast your vote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!publicKey ? (
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-stone-600">Connect your wallet to vote on this proposal.</p>
                    <Button size="sm" onClick={() => connect()} loading={connecting}>
                      Connect wallet
                    </Button>
                  </div>
                ) : alreadyVoted ? (
                  <p className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-sm text-stone-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> You have voted on this proposal.
                  </p>
                ) : (
                  <>
                    {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                    <div className="flex gap-3">
                      <Button onClick={() => castVote(true)} loading={voting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        <ThumbsUp className="h-4 w-4" /> Vote in favour
                      </Button>
                      <Button onClick={() => castVote(false)} loading={voting} variant="danger" className="flex-1">
                        <ThumbsDown className="h-4 w-4" /> Vote against
                      </Button>
                    </div>
                    <p className="text-center text-xs text-stone-400">
                      A strict majority of contributors releases the funds automatically.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tally + history */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Vote tally
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Number(proposal.totalVoters) === 0 ? (
                <p className="py-4 text-center text-sm text-stone-400">No votes yet.</p>
              ) : (
                <div className="space-y-4">
                  <Tally label="In favour" count={proposal.votesYes} pct={yp} color="bg-emerald-500" text="text-emerald-600" />
                  <Tally label="Against" count={proposal.votesNo} pct={np} color="bg-rose-400" text="text-rose-500" />
                  <p className="border-t border-stone-100 pt-3 text-sm text-stone-500">
                    {proposal.totalVoters} vote{Number(proposal.totalVoters) === 1 ? '' : 's'} cast
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voters</CardTitle>
            </CardHeader>
            <CardContent>
              {votes.length === 0 ? (
                <p className="py-4 text-center text-sm text-stone-400">No voters yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {votes.slice(0, 10).map((v) => (
                    <li key={v.id} className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          v.inFavor ? 'bg-emerald-100' : 'bg-rose-100'
                        }`}
                      >
                        {v.inFavor ? (
                          <ThumbsUp className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ThumbsDown className="h-3 w-3 text-rose-500" />
                        )}
                      </span>
                      <span className="font-mono text-sm text-stone-700">{truncateAddress(v.voterPublicKey, 5)}</span>
                      <span className="ml-auto text-xs text-stone-400">
                        wt {formatAmount(v.weightStroops)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Tally({ label, count, pct, color, text }: { label: string; count: string; pct: number; color: string; text: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className={`font-medium ${text}`}>
          {label} ({count})
        </span>
        <span className="font-semibold text-ink">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
