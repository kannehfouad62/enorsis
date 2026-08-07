# B2.9.2.6 — Durable Retry, Timeout, Parallel Join & Failure Recovery

Adds governed JOIN behavior, retry policy/backoff, persisted retry scheduling,
timeout failure processing, parallel-branch join readiness, operator recovery,
recovery audit signals, and a combined durable recovery scheduler cycle.

Use the existing hourly scheduler. Do not create another cron route.

```ts
import { runDurableAutomationRecoveryCycle } from "@/core/enterprise-automation/durable-scheduler-v2";

await runDurableAutomationRecoveryCycle();
```
