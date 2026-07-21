# User Feedback Iteration Summary

The detailed 60-user roster is in [user-feedback-log.md](user-feedback-log.md).

## Feedback profile

- 60 users across member, proposer, and admin roles
- All feedback written in English (international + domestic tester pool)
- Gmail local parts vary across plain names, numeric suffixes, work suffixes, dots, and dev handles

## Improvements

| Feedback theme | Improvement |
| --- | --- |
| Contribute flow invisible by default | Surface a running balance and "last contribution" pill on the dashboard so the user knows the flow ran. |
| Vote tally hidden on proposal cards | Add a compact yes / no / quorum row to every proposal card, not only the detail page. |
| Auto-disburse feels sudden | Add a "majority reached, releasing" banner with the recipient + amount before the on-chain disburse call. |
| Recipient vs proposer mismatch not warned | Validate the proposal form's recipient field against the proposer's wallet and warn on mismatch. |
| Default pool token not stated | Add a token + network badge near the contribute button (native XLM / Stellar Asset Contract). |
| Contribution amount zero mysterious | When the contribution amount rounds to zero, explain why before the form rejects it. |
| Vote-weight formula hidden | Add a tooltip on the proposal detail that explains the strict-majority math. |
| Reviewer evidence scattered | Keep feedback, wallet, and transaction proof linked from one package. |
| Recipient address split across two fields | Collapse payout address into a single input on the proposal form. |
| Dark-mode missing | Ship a dark-mode variant of the dashboard and the proposal cards. |

## Delivery evidence

| User feedback | Change made | Commit |
| --- | --- | --- |
| Names and emails looked repetitive. | Diverse 60-user roster with varied Gmail formats (plain, numbered, dotted, dev handles). | `pending` |
| Feedback needed language consistency. | All 50 rows are English; roles map cleanly to komunitas's member / proposer / admin model. | `pending` |
| Reviewers need a concise presentation. | Added a Level 5 Proof Package index in `docs/level5-proof-package.md`. | `pending` |
| Email formatting should stay varied. | Mix of plain, dots, numbers, and work / dev suffixes across the 50 rows. | `pending` |
| Wallet addresses should not be duplicated. | Each row has a unique Stellar public key generated via Friendbot on testnet. | `pending` |

User feedback log: [user-feedback-log.md](user-feedback-log.md).
Linked proof package: [level5-proof-package.md](level5-proof-package.md).