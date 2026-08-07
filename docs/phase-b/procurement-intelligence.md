# B2.8.4 — Procurement Intelligence

Adds live procurement intelligence using existing Enorsis procurement data:
- requisition cycle time
- approval cycle time
- purchase-order cycle time
- aged approval bottlenecks
- total PO value
- invoice value
- identified and realized savings
- savings realization rate
- contract coverage
- active supplier count
- supplier concentration
- price variance
- procurement health score
- top suppliers by PO spend

Primary metrics can be published into the existing Enterprise Analytics layer.

No new Prisma models are required.

Route:

```text
/app/executive/procurement-intelligence
```

AI remains intentionally excluded.
