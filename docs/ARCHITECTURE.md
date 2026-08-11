ARCHITECTURE

komunitas is an on-chain participatory budgeting dapp for neighbourhood and small-group treasuries. Members pool native XLM into one deployed Soroban smart contract on Stellar testnet, anyone opens a funding proposal, the community votes, and the contract itself disburses the grant to the recipient inside the same transaction the moment a strict majority of yes-votes is reached. The web app is a thin coordinator: it builds Soroban invocations, asks Freighter to sign them, and mirrors confirmed results into Postgres. The contract is the authoritative source of truth for balances, votes, and disbursement. There is no server-side keypair signing on the member's behalf; every member action is a real Freighter signature and every contract call is a real Soroban transaction.


STACK

1. Frontend: Next.js 16 App Router.
2. Frontend runtime: React 19 with TypeScript strict mode.
3. Styling: Tailwind v4 with a custom civic palette (warm stone + brand green + amber) defined in src/app/globals.css.
4. Icons: lucide-react.
5. Component variants: class-variance-authority + tailwind-merge + clsx for conditionals.
6. Future i18n scaffolding: next-intl is installed but only English is shipped today.
7. Backend: Next.js route handlers under src/app/api/.
8. Backend layout: thin controller / service split.
9. Controllers: src/server/controller — parse bodies via Zod, call services, wrap responses in ok / created / fromError.
10. Services: src/server/service — own business logic and the Soroban RPC plumbing.
11. Auth model: SEP-10 style — sequence-0 challenge transaction signed in Freighter, verified server-side with Keypair.verify.
12. Errors: single AppError class plus helpers in src/server/lib/http.ts.
13. Crypto helpers: tweetnacl is a transitive dependency of the SDK; jose is available for future JWT signing.
14. Database: PostgreSQL on Supabase, session-mode pooler.
15. ORM: Drizzle ORM with a single shared pg Pool capped at one connection per serverless instance.
16. Migrations: drizzle-kit push --force (pnpm run db:push).
17. Schema location: src/server/db/schema/*.ts, re-exported from schema/index.ts.
18. Blockchain: Stellar testnet.
19. Soroban RPC: https://soroban-testnet.stellar.org — used for contract simulate, send, and poll.
20. Classic Horizon: https://horizon-testnet.stellar.org — used for account loads and the optional USDC changeTrust.
21. Contract: komunitas-fund — Rust Soroban contract built with soroban-sdk 22 and Rust 1.89.0.
22. Contract size: deployed wasm around 18 KB.
23. Contract tests: 10 unit tests with snapshots under contracts/komunitas-fund/test_snapshots/test.
24. Wallet: Freighter browser extension via @stellar/freighter-api v6.0.1.
25. Wallet wrappers: src/lib/wallet.ts wraps isConnected, requestAccess, getAddress, and signTransaction.
26. Network pin: passphrase pinned to testnet so connect works even if Freighter is on mainnet.
27. No custodial signing: there is no server-side keypair signing on the member's behalf.


DIRECTORY LAYOUT

1. src/app/(auth)/connect: client page for the connect prompt.
2. src/app/admin: placeholder for future admin-only tools.
3. src/app/dashboard: server-rendered treasury overview.
4. src/app/dashboard/contribute: the contribute form.
5. src/app/dashboard/layout.tsx: dashboard shell with shared chrome.
6. src/app/proposals: list page.
7. src/app/proposals/new: create form.
8. src/app/proposals/[id]: detail page that re-fetches on each navigation.
9. src/app/proposals/layout.tsx: proposals shell.
10. src/app/stats: public stats page.
11. src/app/stats/layout.tsx: stats shell.
12. src/app/page.tsx: landing page.
13. src/app/api/auth/challenge: POST — issue a SEP-10 challenge XDR.
14. src/app/api/auth/verify: POST — verify signature, set HttpOnly session cookie.
15. src/app/api/auth/logout: POST — delete the session row and clear the cookie.
16. src/app/api/auth/me: GET — return the current publicKey.
17. src/app/api/fund/contribute/prepare: POST — phase 1 of contribute.
18. src/app/api/fund/contribute/submit: POST — phase 2 of contribute.
19. src/app/api/fund/usdc/prepare: POST — phase 1 of USDC changeTrust.
20. src/app/api/fund/usdc/submit: POST — phase 2 of USDC changeTrust.
21. src/app/api/fund/pool: GET — pool mirror.
22. src/app/api/fund/members: GET — member list ordered by contribution.
23. src/app/api/fund/deposits: GET — recent 20 deposits.
24. src/app/api/proposals: GET — list proposals, optional ?status= filter.
25. src/app/api/proposals/[id]: GET — proposal detail + votes.
26. src/app/api/proposals/prepare: POST — phase 1 of create_proposal.
27. src/app/api/proposals/submit: POST — phase 2 of create_proposal.
28. src/app/api/proposals/[id]/vote/prepare: POST — phase 1 of vote.
29. src/app/api/proposals/[id]/vote/submit: POST — phase 2 of vote.
30. src/app/api/stats: GET — public read-only aggregator.
31. src/app/api/stream: SSE scaffolding (not actively pushed today).
32. src/app/globals.css: Tailwind v4 entry + design tokens.
33. src/app/layout.tsx: root layout that wires the AppShell.
34. src/server/controller/auth.controller.ts: HTTP boundary for SEP-10 auth.
35. src/server/controller/fund.controller.ts: HTTP boundary for contribute and USDC changeTrust.
36. src/server/controller/proposal.controller.ts: HTTP boundary for create_proposal and vote.
37. src/server/service/auth.service.ts: challenge + signature verify + session row.
38. src/server/service/fund.service.ts: contribute XDR + USDC changeTrust + DB mirror.
39. src/server/service/proposal.service.ts: create_proposal + vote + DB mirror.
40. src/server/stellar/network.ts: Horizon and Soroban RPC setup.
41. src/server/stellar/contract.ts: prepareInvoke + submitSigned + readContract.
42. src/server/stellar/assets.ts: asset code to Stellar Asset object.
43. src/server/stellar/index.ts: public re-export surface.
44. src/server/db/schema/authNonces.ts: one-time challenge rows.
45. src/server/db/schema/sessions.ts: active session rows.
46. src/server/db/schema/members.ts: per-wallet member rows.
47. src/server/db/schema/fundPool.ts: single-row pool ledger.
48. src/server/db/schema/proposals.ts: proposal rows + status enum.
49. src/server/db/schema/votes.ts: vote rows.
50. src/server/db/schema/deposits.ts: confirmed deposit rows.
51. src/server/db/schema/index.ts: re-exports.
52. src/server/db/client.ts: Drizzle wrapper around singleton pg Pool.
53. src/server/lib/http.ts: AppError + ok / created / fromError.
54. src/server/lib/cookies.ts: HttpOnly session cookie helpers.
55. src/server/lib/logger.ts: structured logger.
56. src/server/lib/eventBus.ts: tiny pub/sub.
57. src/server/middleware/withAuth.ts: cookie + session check.
58. src/server/middleware/compose.ts: middleware composition around handlers.
59. src/server/config/env.ts: Zod-validated env object.
60. src/server/config/stellar.ts: thin re-export shim.
61. src/lib/api.ts: typed browser fetch helpers with envelope unwrap.
62. src/lib/wallet.ts: Freighter wrappers.
63. src/lib/utils.ts: cn and friends.
64. src/components: AppShell, ConnectButton, ProposalCard, Logo, ui/.
65. src/components/ui: shadcn-style primitives.
66. contracts/komunitas-fund/src/lib.rs: contract entry points.
67. contracts/komunitas-fund/src/storage.rs: DataKey + TTL bumps.
68. contracts/komunitas-fund/src/types.rs: Proposal + ProposalStatus.
69. contracts/komunitas-fund/src/error.rs: Error enum.
70. contracts/komunitas-fund/src/test.rs: 10 unit tests.
71. contracts/komunitas-fund/Cargo.toml: crate manifest.
72. contracts/komunitas-fund/test_snapshots: test snapshots.
73. contracts/scripts/deploy.sh: deploy script.
74. contracts/Makefile: build + test targets.
75. tests/unit: vitest unit tests.
76. tests/e2e: Playwright e2e against the live URL with a real Freighter extension.
77. playwright.config.ts: Playwright config.
78. vitest.config.ts: Vitest config.
79. drizzle.config.ts: Drizzle config.
80. drizzle/: migration artefacts.
81. public/: static assets.
82. screen-shot/: JPEG screenshots captured from the real Freighter run.


DATA MODEL

1. auth_nonces.nonce (text, PK): the 32-byte base64 nonce embedded in the challenge XDR.
2. auth_nonces.public_key (text): the wallet the challenge is for.
3. auth_nonces.expires_at (timestamptz): default NONCE_TTL_SECONDS.
4. auth_nonces.consumed_at (timestamptz nullable): set when the nonce is consumed by a successful verify.
5. sessions.id (uuid, PK): the session id stored in the HttpOnly cookie.
6. sessions.public_key (text): the wallet identity.
7. sessions.created_at (timestamptz): default now.
8. sessions.expires_at (timestamptz): default SESSION_TTL_SECONDS.
9. members.id (uuid, PK): per-member row id.
10. members.public_key (text unique): the wallet address.
11. members.contributed_stroops (text): cumulative contribution in stroops.
12. members.joined_at (timestamptz): first contribution time.
13. members.last_contribution_at (timestamptz nullable): last contribution time.
14. fund_pool.id (uuid, PK): row id.
15. fund_pool.treasury_address (text): mirror of the contract admin.
16. fund_pool.total_contributed_stroops (text): cumulative contributed, in stroops.
17. fund_pool.total_released_stroops (text): cumulative released, in stroops.
18. fund_pool.updated_at (timestamptz): last write.
19. proposals.id (uuid, PK): row id.
20. proposals.title (text): human-readable title.
21. proposals.description (text): human-readable description.
22. proposals.request_stroops (text): amount requested, in stroops.
23. proposals.asset_code (text): XLM or USDC.
24. proposals.recipient_address (text): recipient G... address.
25. proposals.proposer_public_key (text): proposer's wallet.
26. proposals.onchain_id (text nullable): u64 returned by the contract.
27. proposals.create_tx_hash (text nullable): Soroban tx hash that created the proposal.
28. proposals.status (enum active | passed | rejected | funded).
29. proposals.votes_yes (text): mirrored yes count.
30. proposals.votes_no (text): mirrored no count.
31. proposals.total_voters (text): mirrored yes + no.
32. proposals.release_tx_hash (text nullable): Soroban tx hash that released the grant.
33. proposals.voting_deadline (timestamptz): window end.
34. proposals.created_at (timestamptz): default now.
35. proposals.funded_at (timestamptz nullable): set on auto-disburse.
36. votes.id (uuid, PK): row id.
37. votes.proposal_id (uuid FK): the proposal.
38. votes.voter_public_key (text): the wallet that voted.
39. votes.in_favor (bool): yes or no.
40. votes.weight_stroops (text): the voter's cumulative contribution at vote time.
41. votes.stellar_tx_hash (text nullable): the on-chain vote tx hash.
42. votes.created_at (timestamptz): default now.
43. deposits.id (uuid, PK): row id.
44. deposits.member_public_key (text): the wallet that contributed.
45. deposits.amount_stroops (text): amount contributed, in stroops.
46. deposits.asset_code (text): default XLM.
47. deposits.stellar_tx_hash (text): the contribute tx hash.
48. deposits.created_at (timestamptz): default now.
49. Indexes and constraints: members.public_key is unique; votes.proposal_id is a FK; all amount columns are text for BigInt precision.


STELLAR INTEGRATION

1. SEP-10 style wallet auth: server builds a sequence-0 challenge transaction with a manageData op carrying a 32-byte base64 nonce.
2. The wallet signs it. Server verifies with Keypair.verify on tx.hash().
3. Network passphrase is pinned to the app's testnet, not the wallet's active network, so connect works even if Freighter is on mainnet.
4. See auth.service.ts and src/app/api/auth/{challenge,verify}/route.ts.
5. Soroban contract invocation: prepareInvoke (in src/server/stellar/contract.ts) loads a fresh source Account via cross-checked Horizon plus Soroban RPC sequence numbers.
6. Builds a TransactionBuilder with contract.call(method, ...scvalArgs).
7. Runs server.prepareTransaction to get the assembled XDR for Freighter.
8. After signing, submitSigned calls server.sendTransaction with TRY_AGAIN_LATER retries, then polls server.getTransaction until SUCCESS.
9. Returns the decoded return value plus the tx hash.
10. Native XLM via Stellar Asset Contract: contributions go through the XLM SAC, id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC.
11. No trustline required, works for any funded wallet.
12. Amounts are i128 in stroops (7 decimals, 10,000,000 stroops per XLM).
13. Soroban contract komunitas-fund, deployed at CBVWE2OYZMFDMYN6DT5JMIJCUOIYABUAPONISO7EX7HSUTIYMNN67NIX.
14. Entry: initialize(admin, token): one-time setup. Records admin and XLM SAC address, unpauses, resets member_count, total_contributed, total_released, proposal_counter to zero. Publishes an init event. Role: deployer only.
15. Entry: contribute(member, amount): pulls XLM from member into the contract via SAC, tracks member stake and member_count, bumps totals. require_auth on member; the inner SAC transfer uses the same signature. Returns the member's new cumulative stake. Role: any funded wallet.
16. Entry: create_proposal(proposer, recipient, amount): requires_auth proposer, assigns a u64 id from proposal_counter, stores a Proposal row with status Active, publishes a propose event with recipient and amount. Role: any wallet.
17. Entry: vote(voter, proposal_id, in_favor): requires_auth voter, refuses if proposal not Active, refuses if the (proposal, voter) key already exists in storage, increments votes_yes or votes_no, then on 2*yes > member_count and enough available balance, calls payout (a SAC transfer from the contract's own balance to the recipient) and flips status to Funded inside the same Soroban transaction. If the vote passes but the treasury is short, status becomes Passed (waiting for funds). Role: any wallet.
18. Entry: disburse(proposal_id): admin-gated fallback for proposals that won the vote but the treasury was short (status Passed). Idempotent guard, requires ProposalNotPassed otherwise. Role: admin.
19. Entry: pause / unpause: admin ops, toggle the global pause flag. require_auth admin.
20. Entry: set_admin / upgrade: admin ops. Upgrade replaces the contract wasm without migrating state (env.deployer().update_current_contract_wasm(new_wasm_hash)).
21. Views: get_member, get_proposal, has_voted, member_count, total_contributed, total_released, available, proposal_count, get_token, get_admin, is_paused.
22. Read-only views: readContract (simulateTransaction) reads get_proposal after each vote to mirror the authoritative tally into Postgres without requiring a signature. Uses the treasury address as the simulation source so it works even for users who are not signed in.
23. Classic ops via Horizon: the optional USDC opt-in uses Operation.changeTrust against a USDC asset code + issuer.
24. Built with TransactionBuilder, signed in Freighter, submitted via server.submitTransaction. Member USDC balances are not yet tracked in DB.
25. Stellar network: pinned to testnet. NEXT_PUBLIC_STELLAR_NETWORK is testnet in production.
26. Horizon URL: https://horizon-testnet.stellar.org.
27. Soroban RPC URL: https://soroban-testnet.stellar.org.
28. Network passphrase: Test SDF Network ; September 2015.
29. Explorer proof: every on-chain tx hash returned by the API is linked to stellar.expert/explorer/testnet.
30. The contract itself is browsable at stellar.expert/explorer/testnet/contract/CBVWE2OYZMFDMYN6DT5JMIJCUOIYABUAPONISO7EX7HSUTIYMNN67NIX.


KEY FLOWS

1. Connect wallet (SEP-10).
2. Browser step: connectWallet (src/lib/wallet.ts) calls Freighter isConnected, then requestAccess, falling back to getAddress. Returns the public key G...
3. POST /api/auth/challenge with { publicKey }. auth.service.createChallenge validates StrKey.isValidEd25519PublicKey, generates a 32-byte nonce, inserts an auth_nonces row with NONCE_TTL_SECONDS expiry, returns a manageData XDR with the nonce as value, source publicKey, sequence 0.
4. Network passphrase is testnet, pinned.
5. Browser step: signXdr(xdr) calls Freighter signTransaction with the pinned testnet passphrase.
6. POST /api/auth/verify with { publicKey, signedXdr }. auth.service.verifyAndCreateSession reconstructs the tx, checks source === publicKey, locates the manageData op with the AUTH_KEY name, pulls the nonce, looks up the matching unconsumed nonce row, checks expiry.
7. Loops tx.signatures and calls Keypair.verify(tx.hash(), sig.signature()) — the real cryptographic check.
8. Marks the nonce consumed, inserts a sessions row with SESSION_TTL_SECONDS expiry, returns { sessionId }.
9. The handler sets the komunitas_session HttpOnly cookie (secure in prod, sameSite lax, maxAge SESSION_TTL_SECONDS).
10. Subsequent calls: withAuth middleware reads the cookie, loads the session, attaches publicKey to the route context.
11. Logout: POST /api/auth/logout deletes the sessions row and clears the cookie.

12. Contribute XLM.
13. Browser step: enters amount in XLM, the client converts to stroops (× 10,000,000).
14. POST /api/fund/contribute/prepare with { amountStroops }. withAuth runs first, then fund.controller.prepareContributionHandler calls fundService.prepareContribution: regex-validates amount, enforces MIN_STROOPS = 1,000,000 (0.1 XLM), calls prepareInvoke(publicKey, contribute, addr(publicKey), i128(amountStroops)). Returns the unsigned XDR.
15. Browser step: signXdr(xdr).
16. POST /api/fund/contribute/submit with { signedXdr, amountStroops }. fundService.submitContribution: submitSigned (send + poll), upsert members row adding amountStroops to contributed_stroops and bumping last_contribution_at, update fund_pool.total_contributed_stroops, insert deposits row with the tx hash. Returns { txHash, amountStroops, assetCode, deposit }.

17. Create proposal.
18. Browser step: enters title (5 to 120 chars), description (20 to 2000 chars), recipient G... address, amount in stroops, voting duration hours (max 720). Asset defaults to XLM.
19. POST /api/proposals/prepare with { recipientAddress, requestStroops }. Controller checks pool availability (contributed - released), throws CONFLICT if overcommitted, then calls proposalService.prepareCreate: prepareInvoke(proposer, create_proposal, addr(proposer), addr(recipient), i128(amount)).
20. Browser step: signXdr(xdr).
21. POST /api/proposals/submit with { signedXdr, title, description, requestStroops, asset, recipientAddress, votingDurationHours }. proposalService.submitCreate: submitSigned, captures returnValue as the on-chain u64 id, inserts a proposals row with onchain_id, create_tx_hash, voting_deadline = now + durationHours, status active.

22. Vote (and auto-disburse).
23. Browser step: clicks Yes or No on a proposal.
24. POST /api/proposals/[id]/vote/prepare with { inFavor }. proposalService.prepareVote: load proposal, assert onchain_id and status active and votingDeadline > now, assert no existing vote row for this (proposal, voter), call prepareInvoke(voter, vote, addr(voter), u64(onchainId), bool(inFavor)).
25. Browser step: signXdr(xdr).
26. POST /api/proposals/[id]/vote/submit with { signedXdr, inFavor }. proposalService.submitVote: submitSigned, insert votes row with the member's contribution as weight_stroops and stellar_tx_hash, then readContract(get_proposal, u64(onchainId)) to get the authoritative votes_yes, votes_no, status. Update proposals row.
27. If status is funded and was not before, set release_tx_hash = the same tx hash (auto-disburse happened in the same transaction) and funded_at = now, and increment fund_pool.total_released_stroops by request_stroops.

28. Stats.
29. GET /api/stats (no auth, public). Five sequential queries (sessions, members, deposits, votes, proposals, fund_pool) plus exclude filter against excludedStatsKeys (treasury + STATS_EXCLUDE_KEYS env). Returns { uniqueWallets, logins, members, contributions, votes, proposals, fundedProposals, activeProposals, totalContributedStroops, totalReleasedStroops }.
30. Browser renders the values on /stats and the landing totals. The Supabase session-mode pooler has a small client cap so queries run sequentially within a single connection (pool max=1).

31. Enable USDC (opt-in only).
32. Browser step: clicks Enable USDC.
33. POST /api/fund/usdc/prepare. fundService.prepareUsdcTrustline loads the account from Horizon, checks the user does not already have the trustline, builds a changeTrust transaction, returns the XDR.
34. Browser step: signXdr(xdr).
35. POST /api/fund/usdc/submit with { signedXdr }. fundService.submitUsdcTrustline reconstructs the tx, verifies source === publicKey, verifies a changeTrust op exists, then submits via server.submitTransaction and returns { txHash }.


ENVIRONMENT VARIABLES

1. DRIZZLE_DATABASE_URL: PostgreSQL connection string for the Supabase session-mode pooler. Falls back to DATABASE_URL. Required.
2. SESSION_SECRET: random string at least 32 chars. Used for the session cookie path; rotated in deploys.
3. SESSION_COOKIE_NAME: cookie name, default komunitas_session.
4. SESSION_TTL_SECONDS: session lifetime, default 604800 (7 days).
5. NONCE_TTL_SECONDS: challenge nonce lifetime, default 300 (5 minutes).
6. STELLAR_NETWORK: testnet | public | futurenenet. Default testnet. Pin to testnet for the demo.
7. STELLAR_HORIZON_URL: Horizon URL. Default https://horizon-testnet.stellar.org.
8. STELLAR_NETWORK_PASSPHRASE: default Test SDF Network ; September 2015.
9. SOROBAN_RPC_URL: Soroban RPC URL. Default https://soroban-testnet.stellar.org.
10. SOROBAN_CONTRACT_ID: deployed komunitas-fund contract id. Default CBVWE2OYZMFDMYN6DT5JMIJCUOIYABUAPONISO7EX7HSUTIYMNN67NIX.
11. NEXT_PUBLIC_SOROBAN_CONTRACT_ID: same id, exposed to the browser for display.
12. XLM_SAC_CONTRACT_ID: native XLM Stellar Asset Contract id. Default CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC.
13. TREASURY_ADDRESS: admin / funded source for read-only simulates. Default GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47.
14. TREASURY_SECRET: admin secret used for admin fallback disburses and for signing any future admin operations. Stored only in Vercel project env, never committed.
15. NEXT_PUBLIC_USDC_ISSUER: USDC issuer on testnet. Default GAZ5PUFJVFTV6DRJJKP2CBSRBI56CRPCMNXOJFFYLUG26XAUOWHZEZ7G.
16. NEXT_PUBLIC_USDC_CODE: USDC asset code. Default USDC.
17. NEXT_PUBLIC_STELLAR_NETWORK: client-side network pin. Default testnet.
18. NEXT_PUBLIC_APP_NAME: display name. Default Komunitas.
19. NEXT_PUBLIC_APP_URL: public origin. Default http://localhost:3002 in dev.
20. STATS_EXCLUDE_KEYS: comma-separated extra public keys to hide from /stats (treasury is always excluded). Empty by default.
21. NODE_ENV: development | test | production. Default development. Controls db pool reuse and cookie secure flag.


DEPLOY

1. Vercel project name: komunitas.
2. Vercel project id: prj_RUdQeCB5hoKERlWi1yX5n0MA7G2t.
3. Vercel scope / team: team_eqrxYAJNb8f2yCEjwHhAHaR6.
4. Live URL: https://komunitas-rho.vercel.app.
5. Local dev port: 3002.
6. Framework: Next.js 16 (auto-detected by Vercel).
7. Node version: 24.x.
8. Database: Supabase Postgres via Drizzle.
9. The same Supabase project backs the deployed app and local dev.
10. DATABASE_URL points at the Supabase session-mode pooler.
11. Schema push: pnpm run db:push (drizzle-kit push --force).
12. Soroban contract: komunitas-fund.
13. Deployed to Stellar testnet at CBVWE2OYZMFDMYN6DT5JMIJCUOIYABUAPONISO7EX7HSUTIYMNN67NIX.
14. Source in contracts/komunitas-fund/.
15. Build: cd contracts && make test then ./scripts/deploy.sh (requires a funded deployer keypair, see contracts/DEPLOYMENT.md).
16. Install: pnpm install.
17. Build: pnpm run build.
18. Dev: pnpm run dev on port 3002.
19. Unit tests: pnpm test (vitest).
20. E2E tests: pnpm run test:e2e (Playwright against the live URL with PLAYWRIGHT_BASE_URL).
21. Explorer verification: every tx hash returned by the API links to stellar.expert/explorer/testnet.
22. The contract itself is browsable at the URL listed under STELLAR INTEGRATION.


LIMITATIONS AND KNOWN GAPS

1. Session cookies are not yet JWT-signed. They reference a row in the sessions table, so logout revokes them server-side, but a stolen cookie is valid until expiry. Future work: sign with jose and SESSION_SECRET, rotate on privilege change.
2. The USDC asset is opt-in only via changeTrust. USDC contributions and USDC-denominated proposals are scaffolded in the schema and UI but the contract's fund token is hard-coded to native XLM via the XLM SAC. USDC end-to-end flow (contribute / propose / vote / disburse in USDC) is not yet wired through the contract.
3. Voting weight is the member's cumulative contribution in stroops, but the on-chain contract treats every contributor as one equal vote (strict majority of contributing members, not weighted). The DB weight_stroops column records what was used for display; the on-chain tally is one-member-one-vote.
4. The proposals.votes_yes / votes_no / total_voters columns are mirrored from get_proposal after each vote. They will drift if a vote lands on-chain without the DB update completing. The contract remains the source of truth for the on-chain tally; the DB is a cache for the UI.
5. Proposal states Passed (won vote but treasury short) and Rejected (no majority against) are stored in the enum but the contract does not auto-flip a proposal to Rejected on a no-majority — those proposals simply stay Active until the deadline, when the UI marks them Rejected. There is no on-chain deadline enforcement.
6. /api/stream exists but is not wired to a live SSE feed from Soroban RPC today. Live vote tallies and disbursement notifications are refreshed on page load and after each user action, not pushed.
7. The deposit / proposal / vote endpoints mutate DB rows outside an explicit transaction wrapper. A network blip between submitSigned and the DB write can leave the DB out of sync with the on-chain truth. A reconciliation pass that replays missed tx hashes would close the gap.
8. Error mapping in parseSimError (src/server/stellar/contract.ts) is heuristic against error code strings; new contract error variants need to be added there to surface user-friendly messages.
9. There is no rate limiting or abuse protection on /api/auth/* or /api/fund/contribute/prepare beyond the session cookie. Production-grade abuse mitigation (per-IP throttling, captcha, proof-of-contribution before propose) is not implemented.
10. Stats exclude only the treasury address and STATS_EXCLUDE_KEYS. Real human vs bot filtering, sybil-resistance, and proof-of-personhood are out of scope for this build.
11. The contract admin (TREASURY_ADDRESS) is a single keypair. pause / unpause / set_admin / upgrade / disburse all depend on it. A multisig admin would be the right production upgrade path.
12. No background reconciliation job polls Soroban RPC to backfill missed events. The DB mirror is best-effort and grows only when a member interacts through the UI.
13. The XLM SAC contract id is hardcoded as a default but the contract only stores one token at a time. Adding a second token would require an initialize-with-upgrade flow plus a token registry on the contract side.
14. Public pages (landing, dashboard, proposals list, stats) currently render from the DB mirror. A member who only interacts on-chain without ever using the app UI will not appear in the DB; the on-chain event log is the only authoritative record.
15. The contract uses 7-decimal stroops for amounts. Any future non-Stellar asset with different decimals will need an explicit asset-decimals layer in proposalService and the UI.