'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Coins, ExternalLink, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/components/WalletProvider';
import { signXdr } from '@/lib/wallet';
import { api } from '@/lib/api';
import { formatAmount, toStroops, txUrl } from '@/lib/utils';

const PRESETS = ['10', '25', '50', '100'];

export default function ContributePage() {
  const { publicKey, connect, connecting } = useWallet();
  const [preset, setPreset] = useState('25');
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [usdcEnabled, setUsdcEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txHash: string; amount: string } | null>(null);

  const human = custom || preset;
  const stroops = toStroops(human);
  const valid = Number(human) > 0;

  async function enableUsdc() {
    setEnabling(true);
    setError(null);
    setNotice(null);
    try {
      const { xdr } = await api.fund.usdcPrepare();
      const signed = await signXdr(xdr);
      await api.fund.usdcSubmit(signed);
      setUsdcEnabled(true);
      setNotice('USDC trustline enabled on your wallet.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not enable USDC';
      if (msg.toLowerCase().includes('already')) {
        setUsdcEnabled(true);
        setNotice('USDC is already enabled on your wallet.');
      } else {
        setError(msg);
      }
    } finally {
      setEnabling(false);
    }
  }

  async function contribute() {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const { xdr } = await api.fund.contributePrepare(stroops);
      const signed = await signXdr(xdr);
      const res = await api.fund.contributeSubmit(signed, stroops);
      setSuccess({ txHash: res.txHash, amount: res.amountStroops });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Contribution failed');
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) {
    return <ConnectGate onConnect={connect} connecting={connecting} title="Contribute to the treasury" />;
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">Contribution confirmed</h2>
            <p className="mt-2 text-stone-600">
              You added{' '}
              <span className="font-semibold text-ink">{formatAmount(success.amount)} XLM</span>{' '}
              into the community fund contract — settled on-chain.
            </p>
            <a
              href={txUrl(success.txHash)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 break-all rounded-lg bg-stone-100 px-3 py-2 font-mono text-xs text-stone-600 hover:text-brand-700"
            >
              {success.txHash.slice(0, 24)}… <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <div className="mt-6 flex gap-3">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">
                  Treasury
                </Button>
              </Link>
              <Link href="/proposals" className="flex-1">
                <Button className="w-full">Vote on projects</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to treasury
      </Link>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Contribute</h1>
      <p className="mt-1 mb-6 text-stone-600">
        Send real XLM into the on-chain fund contract. Your contribution becomes your voting weight.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Choose an amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-stone-700">Amount (XLM)</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setPreset(a);
                    setCustom('');
                  }}
                  className={`rounded-xl border-2 py-3 font-display font-semibold transition-colors ${
                    preset === a && !custom
                      ? 'border-brand-600 bg-brand-50 text-brand-800'
                      : 'border-stone-200 text-stone-700 hover:border-brand-300'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom amount"
              className="mt-3 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Contributing{' '}
            <span className="font-semibold text-ink">{valid ? human : '—'} XLM</span>{' '}
            into the fund contract. Voting weight scales with how much you put in. Native XLM needs no
            trustline, so it just works.
          </div>

          {notice && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <Button onClick={contribute} loading={loading} disabled={!valid} className="w-full" size="lg">
            <Coins className="h-4 w-4" />
            Contribute {valid ? human : ''} XLM
          </Button>
          <p className="text-center text-xs text-stone-400">
            You will sign a Soroban contract call in Freighter. Network is pinned to Stellar testnet.
          </p>
        </CardContent>
      </Card>

      {/* Optional USDC opt-in (trustline) — kept for members who also want USDC. */}
      <Card className="mt-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-700">Optional: enable USDC on your wallet</p>
            <p className="text-xs text-stone-500">
              {usdcEnabled ? 'USDC trustline is enabled.' : 'One-tap trustline so your wallet can also hold USDC.'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={enableUsdc} loading={enabling} disabled={usdcEnabled}>
            {usdcEnabled ? 'Enabled' : 'Enable USDC'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectGate({ onConnect, connecting, title }: { onConnect: () => void; connecting: boolean; title: string }) {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
            <Wallet className="h-8 w-8 text-brand-700" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-ink">{title}</h2>
          <p className="mt-2 text-stone-600">
            Connect your Freighter wallet to sign the transaction. Browsing stays open without it.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={onConnect} loading={connecting}>
            <Wallet className="h-4 w-4" /> Connect wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
