# Integration Hub & Connector Framework

A6 introduces provider-neutral connectors, credential references, mappings,
sync runs, health checks, and webhook endpoint metadata.

Secrets are never stored directly in the connector credential model.
`secretReference` should point to an environment variable, managed secret
store key, or future dedicated secrets service.

Processing endpoint:

```text
GET or POST /api/platform/integrations/process
Authorization: Bearer <CRON_SECRET>
```
