# API Gateway Network Controls and OpenAPI

## IP allowlists

API clients may define exact addresses or IPv4 CIDR blocks:

```text
203.0.113.10
203.0.113.0/24
```

Leave the field empty to permit requests from any source address.

The gateway obtains the client address from the first `x-forwarded-for` value,
falling back to `x-real-ip`. In production, deploy only behind trusted proxies
that overwrite these headers.

IPv6 exact-address rules are accepted. IPv6 CIDR evaluation is not implemented
in this release.

## Client lifecycle

Tenant administrators may suspend and reactivate clients. Tenant owners may
permanently revoke clients. Revoking a client also revokes every active
credential belonging to that client.

## OpenAPI

Human-readable documentation:

```text
/api-docs
```

Machine-readable OpenAPI 3.1 JSON:

```text
/api/openapi
```

## Implemented read endpoints

```text
GET /api/v1/suppliers
GET /api/v1/purchase-orders
GET /api/v1/invoices
GET /api/v1/contracts
GET /api/v1/sourcing-events
```

All endpoints enforce tenant isolation, scopes, credential status, expiry,
network allowlists, quotas and request audit logging.
