# B2.9.2.12 — Connector SLA, Reliability Governance & Automated Remediation

Extends B2.9.2.11 without introducing a parallel runtime or scheduler.

Adds:
- tenant-configurable connector SLA target and evaluation window
- rolling availability calculation from governed execution audit events
- persisted SLA breach/recovery transitions
- connector reliability scoring
- governed remediation thresholds and cooldowns
- conservative automated remediation through connector governance validation
- SLA and remediation audit events
- registry controls for reliability policy
- expanded connector observability dashboard

Automated remediation intentionally does **not** replay procurement transactions.
It validates connector governance/configuration and can reset recovered circuit state,
preserving the existing runtime idempotency guarantees.
