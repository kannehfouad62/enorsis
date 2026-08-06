# Unified Notification Center

A8 centralizes in-app, email, mobile push, SMS, Teams, Slack, and webhook
notification orchestration.

Core API:

```ts
await createEnterpriseNotification({
  tenantId,
  eventType: "PurchaseOrder.Approved",
  recipientUserId,
  recipientAddress,
  title: "Purchase order approved",
  message: "PO-1042 has been approved.",
  channels: ["IN_APP", "EMAIL"],
});
```

Processing endpoint:

```text
GET or POST /api/platform/notifications/process
Authorization: Bearer <CRON_SECRET>
```

Provider adapters are registered with `registerNotificationProvider()`.
The initial framework delivers in-app messages immediately and keeps external
channels queued until a provider is registered.
