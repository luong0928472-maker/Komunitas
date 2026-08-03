#![no_std]
//! # Komunitas Fund
//!
//! A Soroban smart contract that turns a community treasury into trust-minimized,
//! on-chain governance. It is the core of the Komunitas app: members pool XLM,
//! open funding proposals, vote, and the contract itself releases the grant the
//! moment a proposal wins a strict majority — no backend can move the money or
//! fake an outcome.
//!
//! ## What lives on-chain
//! - **Contributions** — `contribute` pulls XLM from the member into the
//!   contract's custody via the Stellar Asset Contract (SAC) and tracks each
//!   member's cumulative stake.
//! - **Proposals** — `create_proposal` records a recipient + requested amount.
//! - **Votes** — `vote` records one vote per member per proposal, tallied on-chain.
//! - **Disbursement** — when yes-votes pass `2 * yes > member_count`, the
//!   contract transfers the grant to the recipient from its own balance.
//!
//! ## Safety
//! - `require_auth` on every member-driven write (contribute / propose / vote).
//! - Native XLM via SAC — no trustline needed, works for any funded wallet.
//! - Pausable admin + upgradeable Wasm for operational safety.
//! - Storage TTL bumps so balances and proposals never expire mid-flight.

mod error;
mod storage;
mod types;

#[cfg(test)]
mod test;

use error::Error;
use storage::{
    DataKey, ENTRY_BUMP_AMOUNT, ENTRY_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT,
    INSTANCE_LIFETIME_THRESHOLD,
};
use types::{Proposal, ProposalStatus};

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env};

#[contract]
pub struct KomunitasFund;

#[contractimpl]
impl KomunitasFund {
    /// One-time setup. Records the admin and the XLM SAC token address, and
    /// unpauses the contract.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        let i = env.storage().instance();
        i.set(&DataKey::Admin, &admin);
        i.set(&DataKey::Token, &token);
        i.set(&DataKey::Paused, &false);
        i.set(&DataKey::MemberCount, &0u32);
        i.set(&DataKey::TotalContributed, &0i128);
        i.set(&DataKey::TotalReleased, &0i128);
        i.set(&DataKey::ProposalCounter, &0u64);
        bump_instance(&env);
        env.events().publish((symbol_short!("init"),), (admin, token));
        Ok(())
    }

    /// Contribute `amount` of XLM into the community fund. Pulls the deposit into
    /// the contract's custody and tracks the member's cumulative stake. Returns
    /// the member's new total contribution.
    ///
    /// Auth: the member's signature also authorizes the inner SAC transfer.
    pub fn contribute(env: Env, member: Address, amount: i128) -> Result<i128, Error> {
        member.require_auth();
        require_not_paused(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token = get_token(&env)?;
        token::Client::new(&env, &token).transfer(
            &member,
            &env.current_contract_address(),
            &amount,
        );

        let key = DataKey::Member(member.clone());
        let prev: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if prev == 0 {
            let count: u32 = instance_u32(&env, &DataKey::MemberCount);
            env.storage().instance().set(&DataKey::MemberCount, &(count + 1));
        }
        let new_total = prev + amount;
        env.storage().persistent().set(&key, &new_total);
        bump_entry(&env, &key);

        let total: i128 = instance_i128(&env, &DataKey::TotalContributed);
        env.storage()
            .instance()
            .set(&DataKey::TotalContributed, &(total + amount));
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("contrib"),), (member, amount, new_total));
        Ok(new_total)
    }

    /// Open a funding proposal asking for `amount` to be sent to `recipient`.
    /// Returns the new proposal id (1-based).
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        recipient: Address,
        amount: i128,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        require_not_paused(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let id = next_proposal_id(&env);
        let proposal = Proposal {
            proposer,
            recipient,
            amount,
            votes_yes: 0,
            votes_no: 0,
            status: ProposalStatus::Active,
        };
        save_proposal(&env, id, &proposal);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("propose"), id), (proposal.recipient, amount));
        Ok(id)
    }

    /// Cast a vote on a proposal. One vote per member per proposal. When the
    /// yes-votes cross a strict majority of members (`2 * yes > member_count`)
    /// and the treasury holds enough, the contract disburses to the recipient in
    /// the same call. Returns the proposal's resulting status.
    ///
    /// Auth: the voter's signature.
    pub fn vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        in_favor: bool,
    ) -> Result<ProposalStatus, Error> {
        voter.require_auth();
        require_not_paused(&env)?;

        let mut proposal = load_proposal(&env, proposal_id)?;
        if proposal.status != ProposalStatus::Active {
            return Err(Error::ProposalNotActive);
        }

        let voted_key = DataKey::Voted(proposal_id, voter.clone());
        if env.storage().persistent().has(&voted_key) {
            return Err(Error::AlreadyVoted);
        }
        env.storage().persistent().set(&voted_key, &true);
        bump_entry(&env, &voted_key);

        if in_favor {
            proposal.votes_yes += 1;
        } else {
            proposal.votes_no += 1;
        }

        // Strict majority of distinct contributing members.
        let members: u32 = instance_u32(&env, &DataKey::MemberCount);
        if members >= 1 && proposal.votes_yes * 2 > members {
            if available(&env) >= proposal.amount {
                payout(&env, &proposal);
                proposal.status = ProposalStatus::Funded;
            } else {
                // Won the vote, but the treasury is short — wait for funds.
                proposal.status = ProposalStatus::Passed;
            }
        }

        save_proposal(&env, proposal_id, &proposal);
        bump_instance(&env);

        env.events().publish(
            (symbol_short!("vote"), proposal_id),
            (voter, in_favor, proposal.status),
        );
        Ok(proposal.status)
    }

    /// Complete a proposal that already won its vote (`Passed`) once the treasury
    /// has the funds. Idempotent guard against double-pay. Admin-gated fallback
    /// for the auto-disbursement in `vote`.
    pub fn disburse(env: Env, proposal_id: u64) -> Result<i128, Error> {
        admin(&env)?.require_auth();
        require_not_paused(&env)?;

        let mut proposal = load_proposal(&env, proposal_id)?;
        if proposal.status != ProposalStatus::Passed {
            return Err(Error::NotPassed);
        }
        if available(&env) < proposal.amount {
            return Err(Error::InsufficientFunds);
        }
        payout(&env, &proposal);
        proposal.status = ProposalStatus::Funded;
        save_proposal(&env, proposal_id, &proposal);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("disburse"), proposal_id), proposal.amount);
        Ok(proposal.amount)
    }

    // --- Views -------------------------------------------------------------

    pub fn get_member(env: Env, member: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Member(member))
            .unwrap_or(0)
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, Error> {
        load_proposal(&env, proposal_id)
    }

    pub fn has_voted(env: Env, proposal_id: u64, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Voted(proposal_id, voter))
    }

    pub fn member_count(env: Env) -> u32 {
        instance_u32(&env, &DataKey::MemberCount)
    }

    pub fn total_contributed(env: Env) -> i128 {
        instance_i128(&env, &DataKey::TotalContributed)
    }

    pub fn total_released(env: Env) -> i128 {
        instance_i128(&env, &DataKey::TotalReleased)
    }

    pub fn available(env: Env) -> i128 {
        available(&env)
    }

    pub fn proposal_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalCounter)
            .unwrap_or(0u64)
    }

    pub fn get_token(env: Env) -> Result<Address, Error> {
        get_token(&env)
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        admin(&env)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    // --- Admin -------------------------------------------------------------

    pub fn pause(env: Env) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        bump_instance(&env);
        env.events().publish((symbol_short!("pause"),), true);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        bump_instance(&env);
        env.events().publish((symbol_short!("pause"),), false);
        Ok(())
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        bump_instance(&env);
        Ok(())
    }

    /// Replace the contract's own code (admin-gated). Ships fixes without
    /// migrating treasury state.
    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }
}

// --- Internal helpers ------------------------------------------------------

fn admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn get_token(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .ok_or(Error::NotInitialized)
}

fn require_not_paused(env: &Env) -> Result<(), Error> {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .ok_or(Error::NotInitialized)?;
    if paused {
        return Err(Error::Paused);
    }
    Ok(())
}

fn instance_u32(env: &Env, key: &DataKey) -> u32 {
    env.storage().instance().get(key).unwrap_or(0u32)
}

fn instance_i128(env: &Env, key: &DataKey) -> i128 {
    env.storage().instance().get(key).unwrap_or(0i128)
}

fn available(env: &Env) -> i128 {
    instance_i128(env, &DataKey::TotalContributed) - instance_i128(env, &DataKey::TotalReleased)
}

/// Transfer `proposal.amount` from the contract's own balance to the recipient
/// and bump the released counter. Caller must have already validated funds.
fn payout(env: &Env, proposal: &Proposal) {
    let token = env
        .storage()
        .instance()
        .get(&DataKey::Token)
        .expect("token");
    token::Client::new(env, &token).transfer(
        &env.current_contract_address(),
        &proposal.recipient,
        &proposal.amount,
    );
    let released: i128 = instance_i128(env, &DataKey::TotalReleased);
    env.storage()
        .instance()
        .set(&DataKey::TotalReleased, &(released + proposal.amount));
}

fn next_proposal_id(env: &Env) -> u64 {
    let current: u64 = env
        .storage()
        .instance()
        .get(&DataKey::ProposalCounter)
        .unwrap_or(0u64);
    let id = current + 1;
    env.storage().instance().set(&DataKey::ProposalCounter, &id);
    id
}

fn load_proposal(env: &Env, id: u64) -> Result<Proposal, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Proposal(id))
        .ok_or(Error::ProposalNotFound)
}

fn save_proposal(env: &Env, id: u64, proposal: &Proposal) {
    let key = DataKey::Proposal(id);
    env.storage().persistent().set(&key, proposal);
    bump_entry(env, &key);
}

fn bump_entry(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, ENTRY_LIFETIME_THRESHOLD, ENTRY_BUMP_AMOUNT);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}
