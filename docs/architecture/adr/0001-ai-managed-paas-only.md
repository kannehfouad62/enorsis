# ADR 0001: AI is restricted to Managed PaaS

## Status
Accepted.

## Decision
AI capabilities are available only through `MANAGED_PAAS`, unless a platform
operator grants an explicit tenant entitlement.

## Enforcement
The `AI_PLATFORM` feature is marked `managedPaaSOnly`. Runtime access must use
`requireFeature()` or `hasFeature()` from `src/core/licensing`.
