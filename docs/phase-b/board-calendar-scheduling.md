# B2.8.6.3 — Board Calendar, Scheduling & Automatic Pack Generation

Adds:
- monthly, quarterly and annual schedules
- day-of-month and UTC execution hour
- annual month selection
- next-run and last-run tracking
- schedule execution history
- optional auto-finalization
- run-now support
- automatic generation from board-pack definitions
- scheduler adapter for the existing Enorsis scheduler

No duplicate cron route is introduced.

Scheduler integration:

```ts
import { runScheduledExecutiveBoardReporting } from "@/core/executive-board-reporting/scheduler-adapter";

await runScheduledExecutiveBoardReporting();
```

Route:

```text
/app/executive/board-calendar
```
