# Enorsis Workflow Notifications

## Environment variables

In-app notifications require no external service.

Optional email delivery requires:

```env
RESEND_API_KEY="re_..."
WORKFLOW_EMAIL_FROM="Enorsis <workflow@your-verified-domain.com>"
NEXT_PUBLIC_APP_URL="https://your-enorsis-domain.com"
```

Do not use an unverified sender domain in production.

## Processor

Protected endpoint:

```text
GET /api/workflows/notifications/process
Authorization: Bearer <CRON_SECRET>
```

The processor:

1. Creates due-soon and overdue reminders.
2. Claims pending notification records.
3. Delivers in-app notifications immediately.
4. Sends email notifications when Resend is configured.
5. Retries failed delivery with exponential backoff.
6. Cancels delivery after five unsuccessful attempts.

Recommended Vercel cron entry:

```json
{
  "path": "/api/workflows/notifications/process",
  "schedule": "*/10 * * * *"
}
```

Merge it with all existing cron entries.

## Module event hooks

Import:

```ts
import { emitProcurementWorkflowEvent } from "@/modules/workflows/hooks";
```

Then call it after the business transaction succeeds:

```ts
await emitProcurementWorkflowEvent({
  tenantId: user.tenantId,
  event: "purchase_request.submitted",
  resourceType: "PurchaseRequest",
  resourceId: request.id,
  startedByUserId: user.id,
  context: {
    amount: Number(request.usdEquivalent),
    currency: request.originalCurrency,
    priority: request.priority,
  },
});
```

Do not call workflow hooks inside a transaction that might roll back unless the
workflow records are created through the same transaction client.
