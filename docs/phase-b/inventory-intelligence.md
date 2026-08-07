# B2.8.2 — Inventory Intelligence

Adds a live inventory intelligence calculation layer using the operational B2
models already in Enorsis.

Metrics and analyses:
- inventory turnover
- days inventory outstanding (DIO)
- fill rate
- inventory aging
- slow-moving inventory
- dead stock
- understock / overstock against min-max policies
- ABC classification by inventory value
- XYZ classification by issue-demand variability
- inventory health score
- publication into the governed Enterprise Analytics snapshot layer

No new Prisma models are required.

Route:

```text
/app/executive/inventory-intelligence
```

AI remains intentionally excluded.
