# B2.8.6.4 — Secure Board Distribution & Recipient Management

Adds:
- board and committee recipient groups
- recipient membership
- finalized-pack-only distribution control
- recipient-level delivery records
- access-token hashing
- sent/opened/revoked states
- access-event auditing
- delivery revocation
- distribution history
- enterprise activity and domain events

This phase creates the governance and audit layer for distribution.
Actual outbound email transport can be connected to the existing Resend
notification infrastructure in the next distribution-delivery extension.

Route:

```text
/app/executive/board-distribution
```
