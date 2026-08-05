# Background Job Platform

A4 introduces a centralized job definition, queue, execution, retry, attempt,
and dead-letter model.

Processing endpoint:

```text
GET or POST /api/platform/jobs/process
Authorization: Bearer <CRON_SECRET>
```

Modules should register a handler through `registerPlatformJobHandler()` and
queue work through `queuePlatformJob()` rather than creating a new cron route.
