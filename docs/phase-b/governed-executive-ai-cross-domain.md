# B2.8.5.2 — Explainable Insight Generation & Cross-Domain Correlation

Adds deterministic cross-domain executive correlations using existing governed
analytics and B2.8.5.1 insight storage.

Correlations include:
- aged procurement approvals + understock + fill-rate degradation
- overstock + dead stock + unrealized procurement savings
- short picks + understock + warehouse-health degradation
- supplier concentration + receiving-quality weakness
- supplier concentration + weak contract coverage
- simultaneous enterprise operating strength

Each correlated insight:
- has explicit evidence
- stores confidence score
- records a deterministic rule ID
- identifies human-review requirements
- uses the existing governed insight models
- remains fully auditable

No new Prisma models are required.
No external LLM is called.
