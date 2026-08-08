# RC1 Module Integrity and Settings Command Center

Apply this patch, then run:

`node scripts/apply-rc1-module-integrity.mjs`

The upgrade script modifies the existing Enterprise Modules registry using
exact text replacement, avoiding fragile Git patch line matching.

It:
- points AI Procurement to `/app/agents`
- keeps `/app/ai` as a compatibility redirect
- points Procure to Pay to `/app/requisition-to-order`
- keeps `/app/procure-to-pay` as a compatibility redirect
- registers AI Automation Copilot under Intelligence
- registers Enterprise Process Mining under Intelligence
- registers Full Enterprise RC1 under Platform
- creates `/app/settings` as a Platform Settings command center

Then validate with:

`node scripts/validate-enterprise-module-routes.mjs`

No Prisma migration is required.
