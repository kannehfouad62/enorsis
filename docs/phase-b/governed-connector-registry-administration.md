# B2.9.2.9 — Governed Connector Registry & Administration

Adds tenant-managed connectors, activation controls, configuration testing,
usage visibility, credential references, and registry-backed execution by
`connectorKey`.

Route: `/app/automation/connectors`

Workflow actions can reference:

```json
{
  "actionType": "HTTP_REQUEST",
  "connectorKey": "ERP_PRIMARY"
}
```

Secrets remain outside the database. `secretEnvKey` stores only the name of
the server environment variable.
