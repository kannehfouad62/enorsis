# B2.9.2.5 — Durable Workflow Runtime State

Adds persisted workflow execution state:

- durable execution records
- node-level checkpoints
- resumable timed waits
- approval waits
- persisted branch expansion
- execution signals
- retry counters
- wake timestamps
- restart-safe scheduler processing
- runtime operations workspace

No duplicate cron route is created.

Add this call to the existing hourly workflow scheduler:

```ts
import { runDueDurableAutomationExecutions } from "@/core/enterprise-automation/durable-scheduler";

await runDueDurableAutomationExecutions();
```

Route:

```text
/app/automation/runtime
```
