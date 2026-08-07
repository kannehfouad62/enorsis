# B2.8.6.5 — Board Email Delivery & Secure Recipient Portal

Adds:
- Resend-powered distribution emails
- per-recipient cryptographic access tokens
- SHA-256 token hashing; raw tokens are never stored
- configurable access expiration
- secure external recipient portal
- token validation using timing-safe comparison
- access-open audit events
- secure PDF download using the same recipient token
- Resend message ID storage
- delivery failure tracking
- partial-send distribution status

Environment:

```text
RESEND_API_KEY=...
BOARD_REPORT_FROM_EMAIL=Enorsis Board Reporting <board@example.com>
NEXT_PUBLIC_APP_URL=https://your-enorsis-domain.example
```

Recipient route:

```text
/board/secure/:deliveryId?token=...
```

The secure link can be revoked from the Board Distribution workspace.
