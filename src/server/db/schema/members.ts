import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const members = pgTable('members', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicKey: text('public_key').notNull().unique(),
  // Total contributed across all assets, normalised to stroops (7 decimals).
  contributedStroops: text('contributed_stroops').notNull().default('0'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  lastContributionAt: timestamp('last_contribution_at', { withTimezone: true }),
  nextMuxIndex: integer('next_mux_index').notNull().default(0),
});

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;