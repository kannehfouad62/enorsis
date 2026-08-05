# Licensing and Entitlements

RBAC determines whether a user may act. Licensing determines whether the
tenant owns the capability.

```ts
const user = await requireAnyRole(["PROCUREMENT_MANAGER"]);
await requireFeature(user.tenantId, "SUPPLIER_PORTAL");
```

Administration route: `/app/settings/licensing`.
