# Universal Activity Timeline

A9 introduces a tenant-safe, queryable business activity stream.

Use `recordEnterpriseActivity()` for explicit activity records and
`recordActivityFromDomainEvent()` when projecting a domain event into the
timeline.

The new stream complements the existing `AuditEvent` model:

- `AuditEvent` remains the security and compliance audit record.
- `EnterpriseActivity` is the human-readable cross-module business timeline.

Routes:

```text
/app/activity
/app/settings/activity
```
