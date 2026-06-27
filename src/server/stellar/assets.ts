import { Asset, Keypair } from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';
import { STROOPS_PER_UNIT } from './network';

export type AssetCode = 'XLM' | 'USDC';

export function usdcAsset(): Asset {
  return new Asset(env.NEXT_PUBLIC_USDC_CODE, env.NEXT_PUBLIC_USDC_ISSUER);
}

export function assetFor(code: AssetCode): Asset {
  return code === 'USDC' ? usdcAsset() : Asset.native();
}

/** Optional admin keypair (for the admin-gated `disburse` fallback). */
export function getTreasuryKeypair(): Keypair | null {
  if (!env.TREASURY_SECRET) return null;
  try {
    return Keypair.fromSecret(env.TREASURY_SECRET);
  } catch {
    return null;
  }
}

/** stroops (string) → human "1.2500000" decimal string the SDK expects. */
export function stroopsToAmount(stroops: string): string {
  const v = BigInt(stroops);
  const whole = v / STROOPS_PER_UNIT;
  const frac = (v % STROOPS_PER_UNIT).toString().padStart(7, '0');
  return `${whole}.${frac}`;
}

/** human "1.25" decimal string → stroops string. */
export function amountToStroops(amount: string): string {
  const [whole, frac = ''] = amount.split('.');
  const padded = (frac + '0000000').slice(0, 7);
  return (BigInt(whole || '0') * STROOPS_PER_UNIT + BigInt(padded || '0')).toString();
}
