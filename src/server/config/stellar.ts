// Back-compat shim. The real implementation now lives in the clean internal
// Stellar/Soroban module at `@/server/stellar`. Prefer importing from there.
export {
  STROOPS_PER_UNIT,
  getHorizonServer,
  getRpcServer,
  getNetworkPassphrase,
  getContractId,
  getXlmSacId,
  getTreasuryAddress,
  usdcAsset,
  assetFor,
  getTreasuryKeypair,
  stroopsToAmount,
  amountToStroops,
  type AssetCode,
} from '@/server/stellar';
