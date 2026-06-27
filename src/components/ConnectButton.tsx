'use client';
import { useState } from 'react';
import { LogOut, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { useWallet } from './WalletProvider';
import { truncateAddress } from '@/lib/utils';

export function ConnectButton({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { publicKey, ready, connecting, connect, disconnect, error, clearError } = useWallet();
  const [open, setOpen] = useState(false);

  if (!ready) {
    return <div className="h-9 w-28 animate-pulse rounded-xl bg-stone-200" aria-hidden />;
  }

  if (!publicKey) {
    return (
      <div className="relative">
        <Button size={size} onClick={() => connect()} loading={connecting}>
          <Wallet className="h-4 w-4" />
          {connecting ? 'Connecting…' : 'Connect wallet'}
        </Button>
        {error && (
          <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-lg">
            {error}
            <button onClick={clearError} className="mt-1 block font-medium text-rose-500 hover:text-rose-700">
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-stone-50"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="font-mono">{truncateAddress(publicKey)}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                disconnect();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
