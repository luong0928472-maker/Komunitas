# Komunitas Fund — Deployment records

## Mainnet (live)

Deployed 2026-07-06 from identity `komunitas-main`.

| Item | Value |
|---|---|
| **Contract ID** | `CDNEHSQ5PWYC6AXNA4PIEAXCEUNUSVDAOKIVEBEHTRY2SEUJANSMWFVR` |
| Wasm hash | `ecba0ffceff42d43fc451ce9670de5252afd805755563c0f9f1908f115909eaa` |
| Admin (deployer) | `GATMFFV76CQM6JAB5DC4RBSSVOK6RIBYI5IISJWMUYZ2BRVVFR6LLWOD` |
| Token (native XLM SAC) | `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA` |
| Network | Public Global Stellar Network ; September 2015 |
| RPC | https://soroban-rpc.mainnet.stellar.gateway.fm (alt: https://mainnet.sorobanrpc.com) |
| Wasm size | 18,425 bytes (optimized) |

Explorer: https://stellar.expert/explorer/public/contract/CDNEHSQ5PWYC6AXNA4PIEAXCEUNUSVDAOKIVEBEHTRY2SEUJANSMWFVR

### On-chain proof

| Step | Tx | Fee |
|---|---|---|
| Upload wasm | [`ad417560…`](https://stellar.expert/explorer/public/tx/ad417560) | 22.511 XLM |
| Deploy (instantiate) | [`71b46304…`](https://stellar.expert/explorer/public/tx/71b46304648af38597a32ce0c1aac99292bbed09789b258dd96b4f791880dd0c) | 0.018 XLM |
| `initialize(admin, token)` | [`29382d18…`](https://stellar.expert/explorer/public/tx/29382d187d96692967761ed47d9e1e62a3b737af18d5acfc533d928bb5d2c3d5) | 0.064 XLM |

Verified after init: `get_admin()` = deployer, `get_token()` = native XLM SAC,
`total_contributed()` = 0, `is_paused()` = false. Total deploy cost: **22.59 XLM**.

### Production env (Vercel / .env.production)

```bash
STELLAR_NETWORK=public
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
SOROBAN_RPC_URL=https://soroban-rpc.mainnet.stellar.gateway.fm
SOROBAN_CONTRACT_ID=CDNEHSQ5PWYC6AXNA4PIEAXCEUNUSVDAOKIVEBEHTRY2SEUJANSMWFVR
NEXT_PUBLIC_SOROBAN_CONTRACT_ID=CDNEHSQ5PWYC6AXNA4PIEAXCEUNUSVDAOKIVEBEHTRY2SEUJANSMWFVR
XLM_SAC_CONTRACT_ID=CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA
NEXT_PUBLIC_STELLAR_NETWORK=public
TREASURY_ADDRESS=GATMFFV76CQM6JAB5DC4RBSSVOK6RIBYI5IISJWMUYZ2BRVVFR6LLWOD
```

Note: `upgrade(wasm_hash)` re-uploads a new wasm — budget another ~23 XLM for any
future upgrade. Run all tests/demos on testnet; mainnet transactions cost real XLM.

## Testnet deployment record

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
