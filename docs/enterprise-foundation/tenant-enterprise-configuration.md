# Tenant Enterprise Configuration

Centralizes tenant branding, locale, fiscal settings, hosting environment,
data residency, security defaults, retention, notifications, and operational
limits.

Runtime API:

```ts
import {
  getTenantConfiguration,
  getOrCreateTenantConfiguration,
  getTenantOperationalContext,
} from "@/core/configuration";
```

Administration route:

```text
/app/settings/configuration
```
