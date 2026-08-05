# Enterprise Event Bus

Publish governed domain events with `publishDomainEvent()`.

The delivery processor is:

```text
GET or POST /api/platform/events/process
Authorization: Bearer <CRON_SECRET>
```
