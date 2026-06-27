import { Horizon, rpc } from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';

/** XLM/USDC use 7 decimals on Stellar; one unit = 10,000,000 stroops. */
export const STROOPS_PER_UNIT = 10_000_000n;

export function getNetworkPassphrase(): string {
  return env.STELLAR_NETWORK_PASSPHRASE;
}

/** Classic Horizon server (account loads, trustlines, payments). */
export function getHorizonServer(): Horizon.Server {
  return new Horizon.Server(env.STELLAR_HORIZON_URL, { allowHttp: false });
}

/** Soroban RPC server (contract simulate / send / poll). */
export function getRpcServer(): rpc.Server {
  return new rpc.Server(env.SOROBAN_RPC_URL, { allowHttp: false });
}

/** The deployed Komunitas fund contract id. */
export function getContractId(): string {
  return env.SOROBAN_CONTRACT_ID;
}

/** Native XLM Stellar Asset Contract (SAC) id — the fund's token. */
export function getXlmSacId(): string {
  return env.XLM_SAC_CONTRACT_ID;
}

/** Admin / treasury address (contract admin, funded source for read-only sims). */
export function getTreasuryAddress(): string {
  return env.TREASURY_ADDRESS;
}
