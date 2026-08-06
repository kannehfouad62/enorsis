# Release Hardening & Platform Certification

A11 closes Enterprise Foundation 1.0 with evidence-based release readiness.

The framework checks:

- Database connectivity
- Required environment variables
- Dead-letter jobs and event deliveries
- Dead-letter notifications
- Connector error states
- Secrets approaching expiration
- Active policy coverage
- Tenant configuration coverage

Critical failed checks block certification.

Routes:

```text
/app/settings/platform-readiness
POST /api/platform/readiness
Authorization: Bearer <CRON_SECRET>
```
