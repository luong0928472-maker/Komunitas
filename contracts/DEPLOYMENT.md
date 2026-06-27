# Komunitas Fund — Testnet deployment record

Live, verified deployment of the `komunitas-fund` Soroban contract on **Stellar Testnet**.
This contract is the on-chain core of the Komunitas app: members contribute XLM, open
proposals, vote, and the contract itself releases the grant when a proposal wins a strict
majority.

## Addresses

| Item | Value |
|---|---|
| **Contract ID** | `CBVWE2OYZMFDMYN6DT5JMIJCUOIYABUAPONISO7EX7HSUTIYMNN67NIX` |
| Wasm hash | `026519152f9b5f715f74b39e29154f0957976a28b79e0a97dd720cdef2dd5f59` |
| Admin (deployer) | `GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47` |
| Token (native XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Network | Test SDF Network ; September 2015 |
| RPC | https://soroban-testnet.stellar.org |
| Wasm size | 18,428 bytes (optimized) |

Explorer: https://stellar.expert/explorer/testnet/contract/CBVWE2OYZMFDMYN6DT5JMIJCUOIYABUAPONISO7EX7HSUTIYMNN67NIX

## On-chain proof

| Step | Tx |
|---|---|
| Deploy (instantiate contract) | [`e081d5b8…`](https://stellar.expert/explorer/testnet/tx/e081d5b884b0c00d81f2ca6020ddeaa7efb0e1a70ec74d27a15759ce0fceaf8a) |
| `initialize(admin, token)` | [`99c30342…`](https://stellar.expert/explorer/testnet/tx/99c30342f097ad3ddfd16331f6c7293c090a32facb75ce37906973add2048eff) |

After init, `get_admin()` returns the deployer, `get_token()` returns the native XLM SAC,
and `total_contributed()` returns `0`. The contribute / propose / vote / disburse flow is
exercised end-to-end against the live app in `tests/e2e/prod-real.spec.ts`.

## Entrypoints

- `initialize(admin, token)` — one-time setup.
- `contribute(member, amount) -> i128` — member signs; pulls XLM into the contract, tracks stake.
- `create_proposal(proposer, recipient, amount) -> u64` — opens a funding request.
- `vote(voter, proposal_id, in_favor) -> ProposalStatus` — one vote/member; on a strict
  majority (`2 * yes > member_count`) the contract auto-disburses to the recipient.
- `disburse(proposal_id) -> i128` — admin fallback to complete a `Passed` proposal once funded.
- Views: `get_member`, `get_proposal`, `has_voted`, `member_count`, `total_contributed`,
  `total_released`, `available`, `proposal_count`, `get_token`, `get_admin`, `is_paused`.
- Admin: `pause`, `unpause`, `set_admin`, `upgrade`.

## Reproduce

```bash
cd source-code/contracts
make test                                  # 10/10 pass
cargo +1.89.0 build --release --target wasm32-unknown-unknown
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/komunitas_fund.wasm
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/komunitas_fund.optimized.wasm \
  --source <identity> --network testnet
stellar contract invoke --id <CID> --source <identity> --network testnet -- \
  initialize --admin <ADMIN_G...> --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Mainnet

Build + test, deploy with `--network mainnet` from a funded identity, then point the app's
`SOROBAN_CONTRACT_ID` at the new id and set `STELLAR_NETWORK=public`. The contract is
upgradeable (`upgrade(wasm_hash)`, admin-gated) so fixes ship without migrating state.
