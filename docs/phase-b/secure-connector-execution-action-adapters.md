# B2.9.2.8 — Secure Connector Execution & Action Adapters

Adds a governed adapter layer for durable automation actions.

Supported adapter families:
- HTTP request
- webhook
- domain-event-backed internal actions
- notification intent
- task intent
- email intent
- workflow intent

Security:
- HTTPS required for outbound HTTP
- localhost and private IP targets blocked
- connector host allowlist supported
- credentials referenced by environment-variable name
- no plaintext connector secrets stored in workflow JSON
- redirects disabled
- bounded HTTP timeout
- Enorsis idempotency key sent with outbound requests

Internal action types remain routed through the existing domain-event bus,
allowing the platform's existing notification, task, email, and workflow
subsystems to consume them without creating duplicate infrastructure.

Scheduler integration:
Use the existing hourly scheduler only.

```ts
import {
  runEnterpriseAutomationConnectorCycle,
} from "@/core/enterprise-automation/connectors/scheduler";

await runEnterpriseAutomationConnectorCycle();
```

For HTTP actions, action configuration can contain:

```json
{
  "actionType": "HTTP_REQUEST",
  "connector": {
    "url": "https://api.example.com/orders",
    "method": "POST",
    "allowedHosts": ["api.example.com"],
    "secretEnvKey": "ENORSIS_ERP_API_TOKEN",
    "timeoutMs": 15000,
    "asyncResponse": false
  }
}
```
