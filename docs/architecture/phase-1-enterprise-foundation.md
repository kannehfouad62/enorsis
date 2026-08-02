# Enorsis Phase 1: Enterprise Foundation

## Purpose

This phase establishes the governed platform foundation for the Enorsis
cross-industry Procurement-as-a-Service operating system.

## Tenancy model

`Tenant` is the primary security and data-isolation boundary. Every
procurement-domain record added in later phases must include `tenantId`.

A tenant may contain:

- multiple legal entities;
- multiple countries;
- multiple operating sites;
- hierarchical departments;
- users with tenant-specific memberships and roles;
- tenant-specific AI agents and governance policies.

The platform must never trust a tenant identifier submitted from a browser.
The active tenant will be derived from the authenticated server session.

## Currency model

USD remains the Enorsis global reporting standard. Tenants can select one of
three policies:

1. `USD_ONLY`
2. `USD_WITH_LOCAL_DISPLAY`
3. `TENANT_BASE_CURRENCY`

Transactions added later must preserve:

- original amount and currency;
- tenant reporting amount and currency;
- USD equivalent;
- exchange rates used;
- rate provider and effective timestamp.

Amounts and historical rates must never be silently recalculated after a
transaction is approved.

## Authorization model

Phase 1 begins with tenant-scoped role assignments. Authorization services
will combine:

- role-based access control;
- resource ownership;
- legal-entity and site scope;
- approval limits;
- segregation-of-duties rules;
- AI-agent policy constraints.

## AI governance

AI agents are tenant-owned governed actors. Each agent has:

- an autonomy level;
- approved and restricted capabilities;
- a risk tier;
- a human-approval requirement;
- an auditable configuration.

Contract execution, supplier awards, purchase-order release, payment release,
bank-detail changes, and role changes always require human approval.

## Auditability

`AuditEvent` is append-only. It records user, system, integration, and AI-agent
activity. Later services must write audit records for:

- authentication and access decisions;
- tenant and role changes;
- procurement workflow transitions;
- approval and rejection decisions;
- supplier-data changes;
- financial commitments;
- AI recommendations and actions;
- integration activity.

## Next patch

Patch 002 will add:

- Auth.js authentication;
- tenant-aware server session resolution;
- protected application routes;
- enterprise application shell;
- organization switcher;
- role-aware navigation;
- initial onboarding workflow.
