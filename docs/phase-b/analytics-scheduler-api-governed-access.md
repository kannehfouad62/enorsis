# B2.8.1.4 — Scheduler Integration, Analytics APIs & Governed Data Access

Adds:
- normalized tenant-scoped analytics read layer
- executive analytics overview API
- metric history API
- aggregation-run API
- governed manual refresh API
- scheduler adapter for the existing hourly job
- central enterprise-analytics barrel export

No new cron route is introduced.

API routes:

```text
GET  /api/analytics/overview
GET  /api/analytics/metrics/:metricKey
GET  /api/analytics/runs
POST /api/analytics/refresh
```

Scheduler integration:

```ts
import { runScheduledEnterpriseAnalyticsRefresh } from "@/core/enterprise-analytics";

await runScheduledEnterpriseAnalyticsRefresh();
```

The existing Enorsis hourly scheduler should call this adapter. Do not create a
second scheduler.

AI remains intentionally excluded.
