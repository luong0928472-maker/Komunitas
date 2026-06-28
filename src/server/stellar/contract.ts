import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import {
  getContractId,
  getHorizonServer,
  getNetworkPassphrase,
  getRpcServer,
  getTreasuryAddress,
} from './network';
import { AppError } from '@/server/lib/http';
import { logger } from '@/server/lib/logger';

// --- ScVal argument helpers ------------------------------------------------

/** A Stellar account (G…) or contract (C…) address argument. */
export function addr(value: string): xdr.ScVal {
  return new Address(value).toScVal();
}

/** A 128-bit signed integer (token amounts, in stroops). */
export function i128(value: bigint | string): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: 'i128' });
}

/** A 64-bit unsigned integer (proposal ids). */
export function u64(value: bigint | string | number): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: 'u64' });
}

export function bool(value: boolean): xdr.ScVal {
  return xdr.ScVal.scvBool(value);
}

// --- Invoke (prepare → sign → submit) --------------------------------------

/**
 * Build and simulate a contract invocation, returning a prepared (assembled)
 * transaction XDR for the wallet to sign. The caller is the transaction source,
 * so a single Freighter signature satisfies the contract's `require_auth`.
 */
export async function prepareInvoke(
  callerPublicKey: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<string> {
  const server = getRpcServer();
  const account = await getFreshAccount(callerPublicKey);

  const contract = new Contract(getContractId());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  // The public RPC is load-balanced; a just-confirmed entry (e.g. a freshly
  // created proposal) can momentarily be missing from the node that serves the
  // simulation. Retry transient "missing value" / network blips a few times.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const prepared = await server.prepareTransaction(tx);
      return prepared.toXDR();
    } catch (e) {
      lastErr = e;
      if (!isTransientSimError(e) || attempt === 3) break;
      await sleep(2000);
    }
  }
  const msg = parseSimError(lastErr);
  logger.error(`prepareInvoke(${method}) failed: ${msg}`);
  throw new AppError('CONFLICT', msg, 409);
}

export interface SubmitResult {
  hash: string;
  returnValue: unknown;
}

/**
 * Submit a wallet-signed Soroban transaction and poll the RPC until it settles.
 * Returns the tx hash and the decoded contract return value.
 */
export async function submitSigned(signedXdr: string): Promise<SubmitResult> {
  const server = getRpcServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());

  let sent = await server.sendTransaction(tx);
  // TRY_AGAIN_LATER means the node hasn't ingested it yet — resend a few times.
  let resend = 0;
  while (sent.status === 'TRY_AGAIN_LATER' && resend < 3) {
    await sleep(2000);
    sent = await server.sendTransaction(tx);
    resend += 1;
  }
  if (sent.status === 'ERROR') {
    const detail = sent.errorResult ? JSON.stringify(sent.errorResult) : 'send failed';
    logger.error(`sendTransaction error: ${detail}`);
    throw new AppError('CONFLICT', 'Stellar rejected the transaction. Please retry.', 409);
  }

  const hash = sent.hash;
  // Poll for up to ~50s (well within the 60s maxDuration of on-chain routes).
  let attempts = 0;
  let result = await server.getTransaction(hash);
  while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 30) {
    await sleep(1500);
    result = await server.getTransaction(hash);
    attempts += 1;
  }

  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    logger.error(`tx ${hash} settled as ${result.status}`);
    throw new AppError('CONFLICT', 'The on-chain transaction did not succeed. Please retry.', 409);
  }

  let returnValue: unknown = null;
  if (result.returnValue) {
    try {
      returnValue = scValToNative(result.returnValue);
    } catch (e) {
      console.error('[scVal decode]', e);
      returnValue = null;
    }
  }
  return { hash, returnValue };
}

// --- Read-only views (simulate, no signature) ------------------------------

/**
 * Simulate a read-only contract call and return the decoded native value.
 * Uses the treasury (a funded account) as the simulation source.
 */
export async function readContract(method: string, ...args: xdr.ScVal[]): Promise<unknown> {
  const server = getRpcServer();
  const contract = new Contract(getContractId());

  let account: Awaited<ReturnType<typeof server.getAccount>>;
  try {
    account = await server.getAccount(getTreasuryAddress());
  } catch (e) {
    console.error(`readContract(${method}): treasury unfunded, falling back`, e);
    try {
      account = await server.getAccount(getContractId());
    } catch (e2) {
      console.error(`readContract(${method}): contract fallback also failed`, e2);
      throw new AppError('CONFLICT', `Contract read failed: source account unavailable`, 409);
    }
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  for (let attempt = 0; attempt < 4; attempt++) {
    const sim = await server.simulateTransaction(tx);
    if (!rpc.Api.isSimulationError(sim)) {
      const retval = sim.result?.retval;
      return retval ? scValToNative(retval) : null;
    }
    if (!isTransientSimError(sim.error) || attempt === 3) {
      throw new AppError('CONFLICT', `Contract read failed: ${sim.error}`, 409);
    }
    await sleep(1500);
  }
  return null;
}

// --- helpers ---------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Build a source Account using the HIGHEST sequence number reported by both the
 * Soroban RPC and Horizon. The public RPC is load-balanced: right after a member
 * submits one contract call, the node that serves the next `prepare` can still
 * report the OLD sequence, which yields a duplicate seq → TxBadSeq and the tx
 * never lands. Cross-checking Horizon (separate infra) and taking the max makes
 * back-to-back member actions reliable.
 */
async function getFreshAccount(publicKey: string): Promise<Account> {
  const rpcServer = getRpcServer();
  const horizon = getHorizonServer();
  let best: bigint | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    const [rpcSeq, horizonSeq] = await Promise.all([
      rpcServer
        .getAccount(publicKey)
        .then((a) => BigInt(a.sequenceNumber()))
        .catch(() => null),
      horizon
        .loadAccount(publicKey)
        .then((a) => BigInt(a.sequenceNumber()))
        .catch(() => null),
    ]);

    for (const s of [rpcSeq, horizonSeq]) {
      if (s !== null && (best === null || s > best)) best = s;
    }
    // Both backends agree → the sequence has settled; use it.
    if (rpcSeq !== null && horizonSeq !== null && rpcSeq === horizonSeq) break;
    if (attempt < 3) await sleep(1500);
  }

  if (best === null) {
    throw new AppError(
      'INVALID_INPUT',
      'Your wallet is not funded on testnet yet. Fund it with the Friendbot, then try again.',
      400,
    );
  }
  return new Account(publicKey, best.toString());
}

/** Transient simulation/RPC failures worth a retry (entry not yet propagated). */
function isTransientSimError(e: unknown): boolean {
  const raw = (e instanceof Error ? e.message : String(e)) || '';
  return /MissingValue|missing value|not found|NotFound|#6\b|ProposalNotFound|fetch failed|ECONNRESET|ETIMEDOUT|503|502|429|timeout|temporar/i.test(
    raw,
  );
}

function parseSimError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/InsufficientFunds|#9/.test(raw)) return 'The treasury does not hold enough to cover this.';
  if (/InvalidAmount|#5/.test(raw)) return 'Amount must be greater than zero.';
  if (/AlreadyVoted|#8/.test(raw)) return 'You have already voted on this proposal.';
  if (/ProposalNotActive|#7/.test(raw)) return 'Voting on this proposal has closed.';
  if (/ProposalNotFound|#6/.test(raw)) return 'Proposal not found on-chain.';
  if (/Paused|#4/.test(raw)) return 'The fund is paused.';
  return 'Could not prepare the on-chain transaction. Please retry.';
}
