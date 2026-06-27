import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const PROPOSAL_STATUSES = ['active', 'passed', 'rejected', 'funded'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const proposalStatusEnum = pgEnum('proposal_status', PROPOSAL_STATUSES);

export const proposals = pgTable('proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  requestStroops: text('request_stroops').notNull(),
  assetCode: text('asset_code').notNull().default('XLM'), // XLM | USDC
  recipientAddress: text('recipient_address').notNull(),
  proposerPublicKey: text('proposer_public_key').notNull(),
  // On-chain proposal id (u64) returned by the Soroban contract's create_proposal.
  onchainId: text('onchain_id'),
  // Soroban tx hash that created the proposal on-chain.
  createTxHash: text('create_tx_hash'),
  status: proposalStatusEnum('status').notNull().default('active'),
  votesYes: text('votes_yes').notNull().default('0'),
  votesNo: text('votes_no').notNull().default('0'),
  totalVoters: text('total_voters').notNull().default('0'),
  // Real on-chain payout hash once the treasury releases funds.
  releaseTxHash: text('release_tx_hash'),
  votingDeadline: timestamp('voting_deadline', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  fundedAt: timestamp('funded_at', { withTimezone: true }),
});

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
