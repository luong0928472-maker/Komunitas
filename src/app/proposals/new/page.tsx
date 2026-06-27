'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/components/WalletProvider';
import { signXdr } from '@/lib/wallet';
import { api, type Pool } from '@/lib/api';
import { formatAmount, toStroops } from '@/lib/utils';

export default function NewProposalPage() {
  const router = useRouter();
  const { publicKey, connect, connecting } = useWallet();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    recipientAddress: '',
    votingDurationHours: 72,
  });

  useEffect(() => {
    api.fund.pool().then(setPool).catch(() => {});
  }, []);

  const available = pool
    ? BigInt(pool.totalContributedStroops) - BigInt(pool.totalReleasedStroops)
    : 0n;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const requestStroops = toStroops(form.amount);
      const recipientAddress = form.recipientAddress.trim();
      // Phase 1: build the on-chain create_proposal call.
      const { xdr } = await api.proposals.createPrepare(recipientAddress, requestStroops);
      // Phase 2: sign in Freighter and submit; the contract assigns the proposal id.
      const signed = await signXdr(xdr);
      const createdProposal = await api.proposals.createSubmit({
        signedXdr: signed,
        title: form.title.trim(),
        description: form.description.trim(),
        requestStroops,
        asset: 'XLM',
        recipientAddress,
        votingDurationHours: form.votingDurationHours,
      });
      router.push(`/proposals/${createdProposal.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create proposal');
      setLoading(false);
    }
  }

  if (!publicKey) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
              <Wallet className="h-8 w-8 text-brand-700" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">Propose a project</h2>
            <p className="mt-2 text-stone-600">
              Connect your wallet to submit a funding proposal to the community.
            </p>
            <Button className="mt-6 w-full" size="lg" onClick={() => connect()} loading={connecting}>
              <Wallet className="h-4 w-4" /> Connect wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/proposals" className="mb-6 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to proposals
      </Link>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Propose a project</h1>
      <p className="mt-1 mb-2 text-stone-600">
        Ask the community treasury to fund a project. Members vote; a majority releases the funds on-chain.
      </p>
      <p className="mb-6 text-sm text-stone-500">
        Treasury available now:{' '}
        <span className="font-semibold text-ink">{formatAmount(available.toString())} XLM</span>
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Proposal details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <Field label="Project title">
              <input
                required
                minLength={5}
                maxLength={120}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Repair the riverside footbridge"
                className={inputClass}
              />
            </Field>

            <Field label="What it is & why it matters">
              <textarea
                required
                minLength={20}
                maxLength={2000}
                rows={5}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Describe the project, who it helps, and how the funds will be used."
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Amount (XLM)">
                <input
                  required
                  type="number"
                  min="0.0000001"
                  step="any"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  placeholder="100"
                  className={inputClass}
                />
              </Field>
              <Field label="Voting window">
                <select
                  value={form.votingDurationHours}
                  onChange={(e) => set('votingDurationHours', Number(e.target.value))}
                  className={inputClass}
                >
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                  <option value={168}>7 days</option>
                </select>
              </Field>
            </div>

            <Field label="Recipient Stellar address">
              <input
                required
                value={form.recipientAddress}
                onChange={(e) => set('recipientAddress', e.target.value)}
                placeholder="G…"
                className={`${inputClass} font-mono`}
              />
            </Field>

            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              <Send className="h-4 w-4" /> Submit proposal
            </Button>
            <p className="text-center text-xs text-stone-400">
              You will sign a Soroban call in Freighter to register the proposal on-chain. Funds only
              move when the vote carries.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}
