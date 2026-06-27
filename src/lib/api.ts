export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed');
  return json.data;
}

export type AssetCode = 'XLM' | 'USDC';

export interface Pool {
  treasuryAddress: string | null;
  totalContributedStroops: string;
  totalReleasedStroops: string;
}
export interface Member {
  publicKey: string;
  contributedStroops: string;
  lastContributionAt: string | null;
}
export interface Deposit {
  id: string;
  memberPublicKey: string;
  amountStroops: string;
  assetCode: string;
  stellarTxHash: string;
  createdAt: string;
}
export interface Proposal {
  id: string;
  title: string;
  description: string;
  requestStroops: string;
  assetCode: string;
  recipientAddress: string;
  proposerPublicKey: string;
  onchainId: string | null;
  createTxHash: string | null;
  status: 'active' | 'passed' | 'rejected' | 'funded';
  votesYes: string;
  votesNo: string;
  totalVoters: string;
  releaseTxHash: string | null;
  votingDeadline: string;
  createdAt: string;
  fundedAt: string | null;
}
export interface Vote {
  id: string;
  voterPublicKey: string;
  inFavor: boolean;
  weightStroops: string;
  stellarTxHash: string | null;
  createdAt: string;
}
export interface Stats {
  uniqueWallets: number;
  logins: number;
  members: number;
  contributions: number;
  votes: number;
  proposals: number;
  fundedProposals: number;
  activeProposals: number;
  totalContributedStroops: string;
  totalReleasedStroops: string;
}

export const api = {
  auth: {
    challenge: (publicKey: string) =>
      apiFetch<{ xdr: string; nonce: string; expiresAt: string }>('/api/auth/challenge', {
        method: 'POST',
        body: JSON.stringify({ publicKey }),
      }),
    verify: (publicKey: string, signedXdr: string) =>
      apiFetch<{ publicKey: string }>('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ publicKey, signedXdr }),
      }),
    logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
    me: () => apiFetch<{ publicKey: string | null }>('/api/auth/me'),
  },
  fund: {
    pool: () => apiFetch<Pool>('/api/fund/pool'),
    members: () => apiFetch<Member[]>('/api/fund/members'),
    deposits: () => apiFetch<Deposit[]>('/api/fund/deposits'),
    contributePrepare: (amountStroops: string) =>
      apiFetch<{ xdr: string }>('/api/fund/contribute/prepare', {
        method: 'POST',
        body: JSON.stringify({ amountStroops }),
      }),
    contributeSubmit: (signedXdr: string, amountStroops: string) =>
      apiFetch<{ txHash: string; amountStroops: string; assetCode: AssetCode }>(
        '/api/fund/contribute/submit',
        { method: 'POST', body: JSON.stringify({ signedXdr, amountStroops }) },
      ),
    usdcPrepare: () =>
      apiFetch<{ xdr: string }>('/api/fund/usdc/prepare', { method: 'POST', body: '{}' }),
    usdcSubmit: (signedXdr: string) =>
      apiFetch<{ txHash: string }>('/api/fund/usdc/submit', {
        method: 'POST',
        body: JSON.stringify({ signedXdr }),
      }),
  },
  proposals: {
    list: (status?: string) =>
      apiFetch<Proposal[]>(`/api/proposals${status ? `?status=${status}` : ''}`),
    /** Phase 1: get the unsigned create_proposal XDR. */
    createPrepare: (recipientAddress: string, requestStroops: string) =>
      apiFetch<{ xdr: string }>('/api/proposals/prepare', {
        method: 'POST',
        body: JSON.stringify({ recipientAddress, requestStroops }),
      }),
    /** Phase 2: submit the signed create with metadata. */
    createSubmit: (data: {
      signedXdr: string;
      title: string;
      description: string;
      requestStroops: string;
      asset: AssetCode;
      recipientAddress: string;
      votingDurationHours: number;
    }) => apiFetch<Proposal>('/api/proposals/submit', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) =>
      apiFetch<{ proposal: Proposal; votes: Vote[] }>(`/api/proposals/${id}`),
    /** Phase 1: get the unsigned vote XDR. */
    votePrepare: (id: string, inFavor: boolean) =>
      apiFetch<{ xdr: string }>(`/api/proposals/${id}/vote/prepare`, {
        method: 'POST',
        body: JSON.stringify({ inFavor }),
      }),
    /** Phase 2: submit the signed vote (contract may auto-disburse). */
    voteSubmit: (id: string, signedXdr: string, inFavor: boolean) =>
      apiFetch<{ proposal: Proposal }>(`/api/proposals/${id}/vote/submit`, {
        method: 'POST',
        body: JSON.stringify({ signedXdr, inFavor }),
      }),
  },
  stats: () => apiFetch<Stats>('/api/stats'),
};
