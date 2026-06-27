import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// A real on-chain contribution into the community treasury.
export const deposits = pgTable('deposits', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberPublicKey: text('member_public_key').notNull(),
  amountStroops: text('amount_stroops').notNull(),
  assetCode: text('asset_code').notNull().default('XLM'), // XLM | USDC
  stellarTxHash: text('stellar_tx_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Deposit = typeof deposits.$inferSelect;
export type NewDeposit = typeof deposits.$inferInsert;
