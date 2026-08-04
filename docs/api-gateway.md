# Enorsis Enterprise API Gateway

## Authentication

Use a credential issued from:

```text
/app/settings/api
```

Send it as:

```text
Authorization: Bearer enorsis_<secret>
```

The plaintext key is displayed only once when issued. Enorsis stores only a
SHA-256 hash and a non-sensitive prefix.

## Initial scopes

```text
suppliers:read
purchase-orders:read
invoices:read
contracts:read
sourcing:read
```

The first implemented endpoints are:

```text
GET /api/v1/suppliers
GET /api/v1/purchase-orders
```

## Example

```bash
curl \
  -H "Authorization: Bearer enorsis_YOUR_KEY" \
  https://your-domain.com/api/v1/suppliers
```

## Controls

The gateway enforces:

- Tenant isolation from the authenticated API client
- Client and credential status
- Credential expiry
- Required scopes
- Requests-per-minute quotas
- Requests-per-day quotas
- Credential revocation
- Request IDs
- Audit logs
- No-store response caching

## Current limitations

- IP CIDR fields are stored but enforcement is reserved for the network-policy release.
- OAuth 2.0 client credentials and mTLS are not yet implemented.
- Rate limits use the database request log and are appropriate for the current
  release scale. A future high-volume deployment should use Redis or another
  distributed rate-limit store.
