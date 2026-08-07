from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum InventoryFinancialCostMethod {
  FIFO
  WEIGHTED_AVERAGE
  STANDARD
  SPECIFIC_IDENTIFICATION
}

enum InventoryFinancialLayerStatus {
  OPEN
  PARTIALLY_CONSUMED
  CONSUMED
  ADJUSTED
  CLOSED
}

enum InventoryFinancialReconciliationStatus {
  DRAFT
  REVIEW_REQUIRED
  BALANCED
  APPROVED
  POSTED
  CANCELLED
}

"""

MODELS = """
model InventoryFinancialValuationPolicy {
  id                   String                       @id @default(cuid())
  tenantId             String
  inventoryItemId      String
  locationId           String?
  costMethod           InventoryFinancialCostMethod @default(WEIGHTED_AVERAGE)
  standardUnitCost     Decimal?                     @db.Decimal(18, 6)
  currencyCode         String                       @default("USD")
  effectiveFrom        DateTime                     @default(now())
  effectiveTo          DateTime?
  active               Boolean                      @default(true)
  tenant               Tenant                       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  costLayers           InventoryFinancialCostLayer[]
  createdAt            DateTime                     @default(now())
  updatedAt            DateTime                     @updatedAt

  @@index([tenantId, inventoryItemId, active])
  @@index([locationId])
}

model InventoryFinancialCostLayer {
  id                   String                         @id @default(cuid())
  tenantId             String
  policyId             String
  inventoryItemId      String
  locationId           String
  sourceMovementId     String?
  layerNumber          String
  status               InventoryFinancialLayerStatus @default(OPEN)
  originalQuantity     Decimal                        @db.Decimal(18, 4)
  remainingQuantity    Decimal                        @db.Decimal(18, 4)
  unitCost             Decimal                        @db.Decimal(18, 6)
  currencyCode         String                         @default("USD")
  extendedCost         Decimal                        @db.Decimal(18, 6)
  receivedAt           DateTime                       @default(now())
  closedAt             DateTime?
  tenant               Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  policy               InventoryFinancialValuationPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  createdAt            DateTime                       @default(now())
  updatedAt            DateTime                       @updatedAt

  @@unique([tenantId, layerNumber])
  @@index([tenantId, inventoryItemId, locationId, status])
  @@index([sourceMovementId])
}

model InventoryFinancialValuationSnapshot {
  id                   String   @id @default(cuid())
  tenantId             String
  inventoryItemId      String
  locationId           String
  quantityOnHand       Decimal  @db.Decimal(18, 4)
  averageUnitCost      Decimal  @default(0) @db.Decimal(18, 6)
  inventoryValue       Decimal  @default(0) @db.Decimal(18, 6)
  currencyCode         String   @default("USD")
  asOf                  DateTime @default(now())
  tenant               Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([tenantId, inventoryItemId, locationId])
  @@index([tenantId, asOf])
}

model InventoryFinancialReconciliation {
  id                   String                               @id @default(cuid())
  tenantId             String
  reconciliationNumber String
  status               InventoryFinancialReconciliationStatus @default(DRAFT)
  inventoryItemId      String
  locationId           String
  quantityOnHand       Decimal                              @db.Decimal(18, 4)
  ledgerValue          Decimal                              @db.Decimal(18, 6)
  expectedValue        Decimal                              @db.Decimal(18, 6)
  varianceValue        Decimal                              @db.Decimal(18, 6)
  currencyCode         String                               @default("USD")
  reason               String?
  reviewedByUserId     String?
  approvedByUserId     String?
  reviewedAt           DateTime?
  approvedAt           DateTime?
  postedAt             DateTime?
  tenant               Tenant                               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt            DateTime                             @default(now())
  updatedAt            DateTime                             @updatedAt

  @@unique([tenantId, reconciliationNumber])
  @@index([tenantId, status, createdAt])
  @@index([inventoryItemId, locationId])
}
"""

def bounds(text, model):
    start = text.find(f"model {model} {{")
    if start < 0:
        raise SystemExit(f"Could not locate {model} model.")
    opening = text.find("{", start)
    depth = 0
    for i in range(opening, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return start, i
    raise SystemExit(f"Could not locate end of {model} model.")

if "enum InventoryFinancialCostMethod" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  inventoryFinancialValuationPolicies InventoryFinancialValuationPolicy[]",
    "  inventoryFinancialCostLayers InventoryFinancialCostLayer[]",
    "  inventoryFinancialValuationSnapshots InventoryFinancialValuationSnapshot[]",
    "  inventoryFinancialReconciliations InventoryFinancialReconciliation[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model InventoryFinancialValuationPolicy {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Inventory financial valuation schema applied.")
