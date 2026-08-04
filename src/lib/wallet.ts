'use client';
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';

// Network is PINNED to the app's network, not the wallet's active one.
const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
export const NETWORK_PASSPHRASE =
  NETWORK === 'public'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

export class WalletError extends Error {}

/** Prompt Freighter for access and return the wallet address. */
export async function connectWallet(): Promise<string> {
  let detected = false;
  try {
    const c = await isConnected();
    detected = !!c?.isConnected;
  } catch {
    detected = false;
  }
  if (!detected) {
    throw new WalletError(
      'Freighter wallet not detected. Install the Freighter browser extension, then try again.',
    );
  }

  const access = await requestAccess();
  if ('error' in access && access.error) {
    throw new WalletError('Connection request was declined in Freighter.');
  }
  if (access.address) return access.address;

  const addr = await getAddress();
  if ('error' in addr && addr.error) throw new WalletError('Could not read the wallet address.');
  if (!addr.address) throw new WalletError('Could not read the wallet address.');
  return addr.address;
}

/** Sign an XDR, pinning the network passphrase to the app's network (testnet). */
export async function signXdr(xdr: string): Promise<string> {
  const res = await signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
  if ('error' in res && res.error) {
    throw new WalletError('Signing was rejected in Freighter.');
  }
  if (!res.signedTxXdr) throw new WalletError('Wallet returned no signature.');
  return res.signedTxXdr;
}
