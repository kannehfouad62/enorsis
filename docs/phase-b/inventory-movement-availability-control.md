# B2.1 — Inventory Movement & Availability Control

Starts the Inventory & Warehouse Operations domain with:
- governed inventory movement ledger
- location-level availability snapshots
- inventory reservations
- inventory-operation exceptions
- event and activity integration

Existing InventoryItem, InventoryLocation, InventoryBalance, and
InventoryTransaction models remain authoritative and are referenced by ID.

Route:

```text
/app/inventory-operations
```
