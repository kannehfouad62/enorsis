# Enterprise Modules Duplicate Procure-to-Pay Repair

The Enterprise Modules registry contained both:

- Procure to Pay -> `/app/requisition-to-order`
- Requisition-to-Order -> `/app/requisition-to-order`

Because module metadata is keyed by href, both resolved to the same
`procure-to-pay` module id, producing a duplicate React key.

This repair removes only the redundant Requisition-to-Order top-level card.

The canonical Procure to Pay module remains and the detailed R2O workspaces
remain registered:
- Purchase Request Integration
- Purchase Order Execution
- Goods Receipt
- Three-Way Match
- Payment Readiness
- Analytics
- Certification

No route or underlying functionality is removed.
