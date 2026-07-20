'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { connectWallet, signXdr } from '@/lib/wallet';

interface WalletState {
  publicKey: string | null;
  ready: boolean; // initial session check finished
  connecting: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.auth
      .me()
      .then((r) => setPublicKey(r.publicKey))
      .catch(() => setPublicKey(null))
      .finally(() => setReady(true));
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const address = await connectWallet();
      const { xdr } = await api.auth.challenge(address);
      const signed = await signXdr(xdr);
      await api.auth.verify(address, signed);
      setPublicKey(address);
      return address;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect wallet');
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setPublicKey(null);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{ publicKey, ready, connecting, error, connect, disconnect, clearError: () => setError(null) }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
