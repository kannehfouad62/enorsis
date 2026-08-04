# Enorsis Access Governance

## Purpose

The Access Governance module introduces periodic access certification and
segregation-of-duties controls for tenant memberships.

## Segregation-of-duties rules

Administrators and compliance users define conflicting role pairs. Examples:

```text
REQUESTER + APPROVER
BUYER + ACCOUNTS_PAYABLE
SUPPLIER_MANAGER + APPROVER
FINANCE + AUDITOR
```

Running a scan compares active memberships against every active rule and
creates or refreshes violation records.

## Access review campaigns

A campaign contains:

- A reviewer
- A due date
- Optional role scope
- One frozen item per in-scope membership
- Current and requested roles
- Review decision
- Decision rationale
- Remediation status and timestamps

## Decisions

Reviewers may:

```text
CERTIFY
REVOKE
CHANGE_ROLE
APPROVE_EXCEPTION
```

Tenant administrators and owners apply remediation. Revocation suspends the
membership. Role changes replace the membership role array with the reviewed
target roles.

## Auditability

Remediation creates an `AuditEvent` containing the membership, requested roles
and originating review status.
