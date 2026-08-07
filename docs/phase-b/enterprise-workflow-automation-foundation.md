# B2.9.1 — Enterprise Workflow Automation Foundation

Adds a governed automation layer above the existing Enorsis workflow engine.

Triggers:
- domain event
- schedule
- record condition
- manual

Actions:
- request existing workflow start
- request notification
- request task
- publish domain event
- log enterprise activity

Governance:
- tenant isolation
- draft/active/paused/disabled lifecycle
- ordered actions
- stop-on-failure control
- action-level execution records
- full automation run history
- scheduler adapter; no duplicate cron route

Scheduler integration:

```ts
import { runScheduledEnterpriseAutomationEngine } from "@/core/enterprise-automation/scheduler-adapter";

await runScheduledEnterpriseAutomationEngine();
```

Route:

```text
/app/automation
```
