# B2.9.2.11 — Connector Circuit Breaker, Self-Healing & Recovery

Extends the governed connector runtime introduced in B2.9.2.10 without creating a parallel execution architecture.

Adds:
- deterministic connector circuit state derived from existing failure telemetry
- circuit opening after five consecutive execution failures
- fifteen-minute cooldown protection
- recovery-ready execution probes after cooldown
- automatic failure-streak reset after successful recovery
- recovery success/failure audit events
- governed blocking of actions while a connector circuit is open
- terminal handling for policy-blocked actions so they cannot remain indefinitely DISPATCHED
- connector observability for open circuits, recovery readiness and retry timestamps

The circuit breaker intentionally reuses `consecutiveFailures` and `lastFailureAt`; no duplicate runtime state is persisted.
