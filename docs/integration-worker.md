# Enorsis Integration Worker

## Required environment variable

Set a strong secret locally and in Vercel:

```env
CRON_SECRET="replace-with-a-long-random-secret"
```

Integration credential references use environment-variable names. For example,
an Integration Connection with:

```text
secretReference = env:ENORSIS_SAP_API_TOKEN
```

requires:

```env
ENORSIS_SAP_API_TOKEN="the-actual-secret"
```

The real credential is never stored in the Enorsis database.

## Vercel cron

Configure a scheduled request to:

```text
GET /api/integrations/process
Authorization: Bearer <CRON_SECRET>
```

A five-minute cadence is appropriate for the initial worker:

```json
{
  "crons": [
    {
      "path": "/api/integrations/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

If the project already has `vercel.json`, merge the `crons` entry rather than
replacing the file.

## Security behavior

The worker:

- Requires HTTPS outside local development.
- Rejects embedded URL credentials.
- Rejects localhost, `.local`, loopback, link-local and private network targets.
- Resolves DNS before sending requests.
- Uses bearer credentials obtained from environment variables.
- Applies per-connection timeouts.
- Refuses redirects.
- Truncates stored response bodies.
- Retries with exponential backoff.
- Moves exhausted jobs to the dead-letter state.

## Current delivery contract

Outbound resources are sent as JSON with these headers:

```text
Content-Type: application/json
Authorization: Bearer <resolved integration secret>
X-Enorsis-Correlation-Id: <correlation id>
X-Enorsis-Resource-Type: <resource type>
```

A destination must return an HTTP 2xx response for the job to succeed.
