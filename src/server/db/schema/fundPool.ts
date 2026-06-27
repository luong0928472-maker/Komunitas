import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Single-row treasury ledger mirror (authoritative balance lives on-chain).
export const fundPool = pgTable('fund_pool', {
  id: uuid('id').defaultRandom().primaryKey(),
  treasuryAddress: text('treasury_address'),
  totalContributedStroops: text('total_contributed_stroops').notNull().default('0'),
  totalReleasedStroops: text('total_released_stroops').notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FundPool = typeof fundPool.$inferSelect;
export type NewFundPool = typeof fundPool.$inferInsert;
