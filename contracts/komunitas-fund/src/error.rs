use soroban_sdk::contracterror;

/// All failure modes are explicit, contiguous `u32` codes so the TypeScript
/// client can map them to user-facing messages without guessing.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
    Paused = 4,
    InvalidAmount = 5,
    ProposalNotFound = 6,
    ProposalNotActive = 7,
    AlreadyVoted = 8,
    InsufficientFunds = 9,
    NotPassed = 10,
}
