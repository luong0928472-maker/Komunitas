import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STROOPS = 10_000_000;

/** Format a stroop string (7 decimals) into a human amount. */
export function formatAmount(stroops: string | number, maxFrac = 2): string {
  const v = Number(stroops) / STROOPS;
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxFrac });
}

/** Human decimal amount -> stroop string. */
export function toStroops(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n) || n < 0) return '0';
  return BigInt(Math.round(n * STROOPS)).toString();
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function timeUntil(date: string | Date): string {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'Voting closed';
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h left`;
  return `${Math.max(1, Math.floor(diff / 60_000))}m left`;
}

export function votePercentage(yes: string, total: string): number {
  const t = Number(total);
  if (t === 0) return 0;
  return Math.round((Number(yes) / t) * 100);
}

export const EXPLORER = 'https://stellar.expert/explorer/testnet';
export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const accountUrl = (key: string) => `${EXPLORER}/account/${key}`;
