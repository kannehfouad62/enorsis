# B1.2 — Purchase Request Integration

Links an existing tenant PurchaseRequest to a RequisitionOrderJourney, stores
submission-readiness evidence, and blocks submission when critical checks fail.
The compatibility layer verifies the authoritative request using only `id` and
`tenantId`, avoiding assumptions about older request line and status fields.
