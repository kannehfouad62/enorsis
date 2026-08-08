# B2.9.2.12 — Enterprise Integration Hub

Extends the existing Enorsis integration framework without replacing its
connector registry, durable sync queue, tenant isolation, credential-reference
model, or health-check runtime.

This phase adds:

- first-class provider profiles for SAP S/4HANA
- first-class provider profiles for Oracle Fusion Cloud ERP
- first-class provider profiles for Microsoft Dynamics 365
- first-class provider profiles for Coupa
- first-class provider profiles for SAP Ariba
- governed enterprise object capability metadata
- provider-specific credential guidance
- object mapping administration
- mapping-aware synchronization requests
- source-to-pay and ERP catalog initialization
- explicit credential-reference-only configuration guidance

No provider credentials are persisted in connector configuration. Credentials
remain external secret references owned by the existing Integration Hub
credential model.

No Prisma migration is required because Coupa/Ariba providers, connection
mappings, credentials and durable integration sync models already exist.
