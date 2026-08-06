# Enterprise Policy & Configuration Framework

A10 complements TenantConfiguration with versioned, reusable policy definitions
and controlled feature flags.

Use TenantConfiguration for stable tenant attributes such as locale, currency,
branding, security defaults, and residency.

Use EnterprisePolicyDefinition for governed module behavior that may vary by
tenant and change over time.

Use EnterpriseFeatureFlag for staged releases, pilots, emergency disablement,
commercial prerequisites, and Managed PaaS-only capabilities.

Runtime API:

```ts
const approvalLimit = await getEnterprisePolicy<number>(
  tenantId,
  "procurement.approval.single-user-limit",
);

const decision = await isEnterpriseFeatureFlagEnabled({
  tenantId,
  flagKey: "supplier-risk-v2",
  subjectKey: user.id,
});
```
