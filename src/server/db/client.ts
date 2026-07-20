import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/server/db/schema';

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

const globalForDb = globalThis as unknown as {
  pgPool: Pool | undefined;
};

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    // The Supabase session-mode pooler caps total clients (15). Keeping one
    // connection per serverless instance stays well under that even when many
    // instances are warm; queries within a request run sequentially.
    max: 1,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
