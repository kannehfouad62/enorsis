# B2.8.3 — Warehouse Intelligence & Performance Analytics

Adds live warehouse performance analytics using existing B2 operational data:
- receiving acceptance rate
- receiving cycle time
- putaway cycle time
- open and aged putaway queues
- pick accuracy
- short-pick rate
- pick cycle time
- fulfillment cycle time
- location utilization
- transfer cycle time
- transfer receipt accuracy
- open warehouse discrepancies
- throughput quantity
- warehouse health score

Primary metrics can be published into the existing Enterprise Analytics layer.

No new Prisma models are required.

Route:

```text
/app/executive/warehouse-intelligence
```

AI remains intentionally excluded.
