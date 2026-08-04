# Enorsis Workflow Automation

## Automatic trigger endpoint

Protected endpoint:

```text
POST /api/workflows/trigger
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json
```

Example:

```json
{
  "tenantId": "tenant-id",
  "event": "purchase_request.submitted",
  "resourceType": "PurchaseRequest",
  "resourceId": "request-id",
  "startedByUserId": "user-id",
  "context": {
    "amount": 25000,
    "currency": "USD",
    "riskTier": "MODERATE",
    "countryCode": "US"
  }
}
```

The trigger service:

- Finds active workflow definitions matching the tenant, event and resource.
- Evaluates definition conditions.
- Avoids duplicate active instances for the same definition and record.
- Launches qualifying workflows.
- Creates an audit event for each automatically started instance.

## Delegation processor

Protected endpoint:

```text
GET /api/workflows/delegations/process
Authorization: Bearer <CRON_SECRET>
```

The processor:

- Applies active delegations to eligible workflow tasks.
- Preserves the original assignee in `delegatedFromUserId`.
- Respects the workflow step's `allowDelegation` setting.
- Deactivates expired delegation records.

Recommended Vercel cron entry:

```json
{
  "path": "/api/workflows/delegations/process",
  "schedule": "*/10 * * * *"
}
```

Merge this entry with existing integration and workflow SLA cron entries.

## Initial trigger event conventions

Recommended event names:

```text
purchase_request.submitted
purchase_request.approved
supplier.submitted
supplier.risk_high
sourcing_event.published
sourcing_award.recommended
contract.submitted
contract.renewal_due
invoice.exception
payment_batch.submitted
ai_agent_task.approval_required
```

Module actions can call `triggerWorkflowEvent` directly after a successful
database transaction, avoiding an HTTP call inside the application.
