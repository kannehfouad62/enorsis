# Enorsis

AI-native, multi-tenant Procurement-as-a-Service platform built with Next.js App Router, React, TypeScript and Tailwind CSS.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current foundation

- Futuristic public marketing site
- Platform, Solutions, Who We Serve, Pricing, About, Resources and Careers pages
- Tenant onboarding prototype
- Procurement command-center prototype
- USD base ledger with selectable organization display/default currency
- Demo currency conversion API
- Enorsis SVG logo and site icon
- Prisma-ready dependency foundation

## Recommended production architecture

- PostgreSQL on Prisma Data Platform
- Prisma 7 organization-isolated schema
- NextAuth v5 with SSO and MFA
- Row-level tenant authorization in every server action and query
- Immutable audit events
- Object storage for contracts, quotations and supplier evidence
- Licensed FX provider with historical rate snapshots
- Background jobs for sourcing agents, risk monitoring and workflow SLAs

The conversion rates included in this starter are illustrative only and must not be used for real financial transactions.
