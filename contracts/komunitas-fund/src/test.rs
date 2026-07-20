#![cfg(test)]

use crate::error::Error;
use crate::types::ProposalStatus;
use crate::{KomunitasFund, KomunitasFundClient};

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Address, Env};

struct Setup<'a> {
    env: Env,
    client: KomunitasFundClient<'a>,
    token_client: TokenClient<'a>,
    sac: StellarAssetClient<'a>,
    admin: Address,
}

fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);

    // A Stellar Asset Contract stands in for the native XLM SAC.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();

    let contract_id = env.register(KomunitasFund, ());
    let client = KomunitasFundClient::new(&env, &contract_id);
    client.initialize(&admin, &token);

    Setup {
        token_client: TokenClient::new(&env, &token),
        sac: StellarAssetClient::new(&env, &token),
        env,
        client,
        admin,
    }
}

/// Create a funded member with `balance` minor units.
fn member(s: &Setup, balance: i128) -> Address {
    let m = Address::generate(&s.env);
    s.sac.mint(&m, &balance);
    m
}

#[test]
fn initialize_records_admin_and_token() {
    let s = setup();
    assert_eq!(s.client.get_admin(), s.admin);
    assert_eq!(s.client.member_count(), 0);
    assert_eq!(s.client.total_contributed(), 0);
    assert!(!s.client.is_paused());
}

#[test]
fn double_initialize_fails() {
    let s = setup();
    let res = s.client.try_initialize(&s.admin, &s.admin);
    assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn contribute_tracks_member_and_totals() {
    let s = setup();
    let a = member(&s, 1_000);
    let b = member(&s, 1_000);

    assert_eq!(s.client.contribute(&a, &600), 600);
    // A second contribution from the same member accumulates, no new member.
    assert_eq!(s.client.contribute(&a, &100), 700);
    assert_eq!(s.client.contribute(&b, &400), 400);

    assert_eq!(s.client.get_member(&a), 700);
    assert_eq!(s.client.get_member(&b), 400);
    assert_eq!(s.client.member_count(), 2);
    assert_eq!(s.client.total_contributed(), 1_100);
    assert_eq!(s.client.available(), 1_100);
    // Funds really moved into the contract's custody.
    assert_eq!(s.token_client.balance(&s.client.address), 1_100);
    assert_eq!(s.token_client.balance(&a), 300);
}

#[test]
fn contribute_zero_fails() {
    let s = setup();
    let a = member(&s, 1_000);
    assert_eq!(s.client.try_contribute(&a, &0), Err(Ok(Error::InvalidAmount)));
}

#[test]
fn single_member_majority_auto_disburses() {
    let s = setup();
    let a = member(&s, 1_000);
    s.client.contribute(&a, &500);

    let recipient = Address::generate(&s.env);
    let id = s.client.create_proposal(&a, &recipient, &300);

    let p = s.client.get_proposal(&id);
    assert_eq!(p.status, ProposalStatus::Active);

    // One member, one yes vote: 2*1 > 1 → auto-disburse.
    let status = s.client.vote(&a, &id, &true);
    assert_eq!(status, ProposalStatus::Funded);

    assert_eq!(s.token_client.balance(&recipient), 300);
    assert_eq!(s.client.total_released(), 300);
    assert_eq!(s.client.available(), 200);
    let p = s.client.get_proposal(&id);
    assert_eq!(p.status, ProposalStatus::Funded);
    assert_eq!(p.votes_yes, 1);
}

#[test]
fn no_majority_keeps_proposal_active() {
    let s = setup();
    let a = member(&s, 1_000);
    let b = member(&s, 1_000);
    let c = member(&s, 1_000);
    s.client.contribute(&a, &400);
    s.client.contribute(&b, &400);
    s.client.contribute(&c, &400);

    let recipient = Address::generate(&s.env);
    let id = s.client.create_proposal(&a, &recipient, &300);

    // 1 yes out of 3 members: 2*1 = 2, not > 3 → stays Active, no payout.
    assert_eq!(s.client.vote(&a, &id, &true), ProposalStatus::Active);
    assert_eq!(s.token_client.balance(&recipient), 0);

    // 2 yes out of 3: 2*2 = 4 > 3 → majority → fund.
    assert_eq!(s.client.vote(&b, &id, &true), ProposalStatus::Funded);
    assert_eq!(s.token_client.balance(&recipient), 300);
}

#[test]
fn double_vote_is_rejected() {
    let s = setup();
    let a = member(&s, 1_000);
    let b = member(&s, 1_000);
    s.client.contribute(&a, &400);
    s.client.contribute(&b, &400);

    let recipient = Address::generate(&s.env);
    let id = s.client.create_proposal(&a, &recipient, &300);
    s.client.vote(&a, &id, &false);
    assert_eq!(
        s.client.try_vote(&a, &id, &true),
        Err(Ok(Error::AlreadyVoted))
    );
}

#[test]
fn passed_then_funded_via_disburse() {
    let s = setup();
    // Two members, small balances. A majority is reached but the treasury is
    // short, so the proposal only reaches Passed.
    let a = member(&s, 1_000);
    let b = member(&s, 1_000);
    s.client.contribute(&a, &100);
    s.client.contribute(&b, &100);

    let recipient = Address::generate(&s.env);
    let id = s.client.create_proposal(&a, &recipient, &500);

    s.client.vote(&a, &id, &true);
    assert_eq!(s.client.vote(&b, &id, &true), ProposalStatus::Passed);
    assert_eq!(s.token_client.balance(&recipient), 0);

    // disburse before funds exist fails.
    assert_eq!(
        s.client.try_disburse(&id),
        Err(Ok(Error::InsufficientFunds))
    );

    // More contributions arrive, then admin completes the payout.
    s.client.contribute(&a, &400);
    assert_eq!(s.client.disburse(&id), 500);
    assert_eq!(s.token_client.balance(&recipient), 500);
    assert_eq!(s.client.get_proposal(&id).status, ProposalStatus::Funded);
}

#[test]
fn vote_on_missing_proposal_fails() {
    let s = setup();
    let a = member(&s, 1_000);
    s.client.contribute(&a, &100);
    assert_eq!(
        s.client.try_vote(&a, &999, &true),
        Err(Ok(Error::ProposalNotFound))
    );
}

#[test]
fn paused_blocks_contributions() {
    let s = setup();
    let a = member(&s, 1_000);
    s.client.pause();
    assert_eq!(s.client.try_contribute(&a, &100), Err(Ok(Error::Paused)));
    s.client.unpause();
    assert_eq!(s.client.contribute(&a, &100), 100);
}
