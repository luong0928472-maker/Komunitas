import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { proposals } from './proposals';

export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  proposalId: uuid('proposal_id')
    .notNull()
    .references(() => proposals.id),
  voterPublicKey: text('voter_public_key').notNull(),
  inFavor: boolean('in_favor').notNull(),
  // Voting weight = contribution in stroops.
  weightStroops: text('weight_stroops').notNull().default('0'),
  // Soroban tx hash of the on-chain vote.
  stellarTxHash: text('stellar_tx_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
