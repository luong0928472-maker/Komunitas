use soroban_sdk::{contracttype, Address};

/// Lifecycle of a funding proposal.
///
/// - `Active`   — open for voting.
/// - `Passed`   — reached a strict majority of members in favour, but the
///   treasury balance was not yet enough to pay out; awaits funds + `disburse`.
/// - `Funded`   — the requested amount was transferred to the recipient.
/// - `Rejected` — closed without funding (reserved for admin/extension use).
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProposalStatus {
    Active = 0,
    Passed = 1,
    Funded = 2,
    Rejected = 3,
}

/// A community funding request, tracked entirely on-chain. Vote tallies and the
/// disbursement decision live here so no backend can fake an outcome.
#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    /// Member who opened the proposal.
    pub proposer: Address,
    /// Address that receives the grant when the proposal is funded.
    pub recipient: Address,
    /// Requested amount, in the token's minor units (XLM SAC = 7 decimals).
    pub amount: i128,
    /// Yes votes (one per distinct voting member).
    pub votes_yes: u32,
    /// No votes.
    pub votes_no: u32,
    pub status: ProposalStatus,
}
