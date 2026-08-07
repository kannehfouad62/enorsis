from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum InventoryCountSessionStatus {
  DRAFT
  IN_PROGRESS
  COUNTED
  REVIEW_REQUIRED
  APPROVED
  POSTED
  CANCELLED
}

enum InventoryCountLineStatus {
  PENDING
  MATCHED
  VARIANCE
  APPROVED
  POSTED
}

enum InventoryReconciliationStatus {
  OPEN
  REVIEWING
  APPROVED
  REJECTED
  POSTED
  CANCELLED
}

enum InventoryAdjustmentDirection {
  INCREASE
  DECREASE
  NONE
}

"""

MODELS = """
model InventoryCountSession {
  id                String                      @id @default(cuid())
  tenantId          String
  countNumber       String
  status            InventoryCountSessionStatus @default(DRAFT)
  countType         String?
  locationId        String?
  startedAt         DateTime?
  countedAt         DateTime?
  approvedAt        DateTime?
  postedAt          DateTime?
  initiatedByUserId String?
  approvedByUserId  String?
  notes             String?
  tenant            Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lines             InventoryCountLine[]
  reconciliations   InventoryReconciliation[]
  createdAt         DateTime                    @default(now())
  updatedAt         DateTime                    @updatedAt

  @@unique([tenantId, countNumber])
  @@index([tenantId, status, createdAt])
  @@index([locationId])
}

model InventoryCountLine {
  id                String                   @id @default(cuid())
  countSessionId    String
  inventoryItemId   String
  locationId        String
  expectedQuantity  Decimal                  @db.Decimal(18, 4)
  countedQuantity   Decimal                  @db.Decimal(18, 4)
  varianceQuantity  Decimal                  @default(0) @db.Decimal(18, 4)
  unitOfMeasure     String                   @default("EA")
  serialLotReference String?
  status            InventoryCountLineStatus @default(PENDING)
  countedByUserId   String?
  countedAt         DateTime?
  countSession      InventoryCountSession    @relation(fields: [countSessionId], references: [id], onDelete: Cascade)
  reconciliations   InventoryReconciliation[]
  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt

  @@index([countSessionId, status])
  @@index([inventoryItemId, locationId])
}

model InventoryReconciliation {
  id                  String                        @id @default(cuid())
  tenantId            String
  countSessionId      String
  countLineId         String
  reconciliationNumber String
  status              InventoryReconciliationStatus @default(OPEN)
  direction           InventoryAdjustmentDirection
  varianceQuantity    Decimal                       @db.Decimal(18, 4)
  reason              String?
  reviewedByUserId    String?
  approvedByUserId    String?
  reviewedAt          DateTime?
  approvedAt          DateTime?
  postedAt            DateTime?
  movementLedgerId    String?
  tenant              Tenant                        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  countSession        InventoryCountSession         @relation(fields: [countSessionId], references: [id], onDelete: Cascade)
  countLine           InventoryCountLine            @relation(fields: [countLineId], references: [id], onDelete: Cascade)
  createdAt           DateTime                      @default(now())
  updatedAt           DateTime                      @updatedAt

  @@unique([tenantId, reconciliationNumber])
  @@index([tenantId, status, createdAt])
  @@index([countSessionId])
  @@index([countLineId])
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

if "enum InventoryCountSessionStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  inventoryCountSessions InventoryCountSession[]",
    "  inventoryReconciliations InventoryReconciliation[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model InventoryCountSession {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Cycle count and reconciliation schema applied.")
