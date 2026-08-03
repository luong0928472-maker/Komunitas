use soroban_sdk::{contracttype, Address};

/// Storage keys.
///
/// `Admin`, `Token`, `Paused`, the running counters and `ProposalCounter` live
/// in *instance* storage (they share the contract instance TTL). Per-member
/// balances, proposals and vote markers live in *persistent* storage so they
/// outlive the instance and can never expire out from under a pending payout.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Paused,
    MemberCount,
    TotalContributed,
    TotalReleased,
    ProposalCounter,
    /// member address -> cumulative contribution (i128, minor units)
    Member(Address),
    /// proposal id -> Proposal
    Proposal(u64),
    /// (proposal id, voter) -> bool ; presence means "already voted"
    Voted(u64, Address),
}

// Soroban ledgers close ~every 5s → 17,280 ledgers/day.
pub const DAY_IN_LEDGERS: u32 = 17_280;

// Keep the instance (admin/config/counters) alive ~30 days, re-bumped on every
// state-changing call.
pub const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
pub const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

// Member balances / proposals / vote markers are bumped to ~90 days so funds and
// governance state are never stranded by entry expiry.
pub const ENTRY_BUMP_AMOUNT: u32 = 90 * DAY_IN_LEDGERS;
pub const ENTRY_LIFETIME_THRESHOLD: u32 = ENTRY_BUMP_AMOUNT - DAY_IN_LEDGERS;
