#!/usr/bin/env bash
#
# Deploy KomunitasFund to Stellar Testnet (or Mainnet) with the Stellar CLI.
#
# Usage:
#   ./scripts/deploy.sh                              # testnet, identity "komunitas-deployer"
#   NETWORK=mainnet IDENTITY=prod ./scripts/deploy.sh
#
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
IDENTITY="${IDENTITY:-komunitas-deployer}"
WASM="target/wasm32-unknown-unknown/release/komunitas_fund.optimized.wasm"
# Native XLM Stellar Asset Contract id (testnet). Override for mainnet.
TOKEN="${TOKEN:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"

cd "$(dirname "$0")/.."

ADMIN_ADDR="$(stellar keys address "$IDENTITY")"
echo "▶ Network: $NETWORK   Admin: $ADMIN_ADDR"

echo "▶ Building optimized Wasm…"
cargo +1.89.0 build --release --target wasm32-unknown-unknown
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/komunitas_fund.wasm

echo "▶ Deploying…"
CONTRACT_ID=$(stellar contract deploy --wasm "$WASM" --source "$IDENTITY" --network "$NETWORK")
echo "▶ Contract id: $CONTRACT_ID"

echo "▶ Initializing…"
stellar contract invoke --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  initialize --admin "$ADMIN_ADDR" --token "$TOKEN"

echo ""
echo "✅ Done. Add to your app env (.env.local / Vercel):"
echo "   SOROBAN_CONTRACT_ID=$CONTRACT_ID"
echo "   SOROBAN_RPC_URL=https://soroban-${NETWORK}.stellar.org"
echo "   XLM_SAC_CONTRACT_ID=$TOKEN"
