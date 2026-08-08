import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Komunitas'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3002'),
  DRIZZLE_DATABASE_URL: z.string().url(),
  STELLAR_NETWORK: z.enum(['testnet', 'public', 'futurenet']).default('testnet'),
  STELLAR_HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  STELLAR_NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  // Deployed Komunitas fund contract (Soroban). Default = live testnet deployment.
  SOROBAN_CONTRACT_ID: z
    .string()
    .default('CBVWE2OYZMFDMYN6DT5JMIJCUOIYABUAPONISO7EX7HSUTIYMNN67NIX'),
  NEXT_PUBLIC_SOROBAN_CONTRACT_ID: z
    .string()
    .default('CBVWE2OYZMFDMYN6DT5JMIJCUOIYABUAPONISO7EX7HSUTIYMNN67NIX'),
  // Native XLM Stellar Asset Contract (SAC) — the fund's token. No trustline needed.
  XLM_SAC_CONTRACT_ID: z
    .string()
    .default('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'),
  // Community treasury — receives contributions, signs releases.
  TREASURY_ADDRESS: z
    .string()
    .default('GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47'),
  TREASURY_SECRET: z.string().optional(),
  // USDC issuer that the treasury already trusts (testnet).
  NEXT_PUBLIC_USDC_ISSUER: z
    .string()
    .default('GAZ5PUFJVFTV6DRJJKP2CBSRBI56CRPCMNXOJFFYLUG26XAUOWHZEZ7G'),
  NEXT_PUBLIC_USDC_CODE: z.string().default('USDC'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  ADMIN_SECRET: z.string().min(32).optional(),
  SESSION_COOKIE_NAME: z.string().default('komunitas_session'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  NONCE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  NEXT_PUBLIC_STELLAR_NETWORK: z.string().default('testnet'),
  // Wallet keys that must never count as real community interaction in /stats.
  STATS_EXCLUDE_KEYS: z.string().default(''),
});

const parsed = envSchema.safeParse({
  ...process.env,
  DRIZZLE_DATABASE_URL: process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL,
});

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

/** Public keys excluded from /stats (treasury + any configured seed/demo keys). */
export const excludedStatsKeys = new Set(
  [env.TREASURY_ADDRESS, ...env.STATS_EXCLUDE_KEYS.split(',')]
    .map((k) => k.trim())
    .filter(Boolean),
);
