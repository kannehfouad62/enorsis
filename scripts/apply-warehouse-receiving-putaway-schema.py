from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum WarehouseReceivingStatus {
  DRAFT
  RECEIVING
  RECEIVED
  PUTAWAY_PENDING
  COMPLETED
  CANCELLED
}

enum WarehouseReceiptLineStatus {
  EXPECTED
  RECEIVED
  SHORT
  OVER
  DAMAGED
  REJECTED
  QUARANTINED
}

enum PutawayTaskStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum WarehouseLocationStatus {
  ACTIVE
  HOLD
  BLOCKED
  CLOSED
}

enum WarehouseDiscrepancyStatus {
  OPEN
  INVESTIGATING
  RESOLVED
  WAIVED
  CANCELLED
}

enum WarehouseDiscrepancyType {
  SHORT_RECEIPT
  OVER_RECEIPT
  DAMAGED_GOODS
  WRONG_ITEM
  WRONG_LOCATION
  CAPACITY_EXCEEDED
  QUARANTINE_REQUIRED
  SERIAL_LOT_MISMATCH
  OTHER
}

"""

MODELS = """
model WarehouseReceivingSession {
  id                    String                    @id @default(cuid())
  tenantId              String
  receivingNumber       String
  status                WarehouseReceivingStatus  @default(DRAFT)
  sourceType            String?
  sourceId              String?
  purchaseOrderId       String?
  goodsReceiptSessionId String?
  supplierId            String?
  dockLocationId        String?
  carrierReference      String?
  deliveryReference     String?
  receivedByUserId      String?
  startedAt             DateTime?
  receivedAt            DateTime?
  completedAt           DateTime?
  notes                 String?
  tenant                Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lines                 WarehouseReceiptLine[]
  putawayTasks          PutawayTask[]
  discrepancies         WarehouseDiscrepancy[]
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  @@unique([tenantId, receivingNumber])
  @@index([tenantId, status, createdAt])
  @@index([purchaseOrderId])
  @@index([goodsReceiptSessionId])
}

model WarehouseReceiptLine {
  id                 String                     @id @default(cuid())
  receivingSessionId String
  lineReference      String
  inventoryItemId    String
  description        String
  expectedQuantity   Decimal                    @db.Decimal(18, 4)
  receivedQuantity   Decimal                    @default(0) @db.Decimal(18, 4)
  acceptedQuantity   Decimal                    @default(0) @db.Decimal(18, 4)
  rejectedQuantity   Decimal                    @default(0) @db.Decimal(18, 4)
  damagedQuantity    Decimal                    @default(0) @db.Decimal(18, 4)
  unitOfMeasure      String                     @default("EA")
  status             WarehouseReceiptLineStatus @default(EXPECTED)
  serialLotReference String?
  expiryDate         DateTime?
  notes              String?
  receivingSession   WarehouseReceivingSession  @relation(fields: [receivingSessionId], references: [id], onDelete: Cascade)
  putawayTasks       PutawayTask[]
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt

  @@index([receivingSessionId, status])
  @@index([inventoryItemId])
}

model WarehouseLocationControl {
  id               String                  @id @default(cuid())
  tenantId         String
  locationId       String
  warehouseCode    String?
  zoneCode         String?
  aisleCode        String?
  binCode          String?
  status           WarehouseLocationStatus @default(ACTIVE)
  capacityQuantity Decimal?                @db.Decimal(18, 4)
  occupiedQuantity Decimal                 @default(0) @db.Decimal(18, 4)
  unitOfMeasure    String                  @default("EA")
  allowsMixedItems Boolean                 @default(true)
  requiresLot      Boolean                 @default(false)
  requiresSerial   Boolean                 @default(false)
  quarantineOnly   Boolean                 @default(false)
  tenant           Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  putawayTasks     PutawayTask[]
  createdAt        DateTime                @default(now())
  updatedAt        DateTime                @updatedAt

  @@unique([tenantId, locationId])
  @@index([tenantId, status])
  @@index([warehouseCode, zoneCode])
}

model PutawayTask {
  id                   String                   @id @default(cuid())
  tenantId             String
  taskNumber           String
  receivingSessionId   String
  receiptLineId        String
  destinationControlId String
  inventoryItemId      String
  quantity             Decimal                  @db.Decimal(18, 4)
  unitOfMeasure        String                   @default("EA")
  status               PutawayTaskStatus        @default(OPEN)
  assignedUserId       String?
  startedAt            DateTime?
  completedAt          DateTime?
  movementLedgerId     String?
  tenant               Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  receivingSession     WarehouseReceivingSession @relation(fields: [receivingSessionId], references: [id], onDelete: Cascade)
  receiptLine          WarehouseReceiptLine      @relation(fields: [receiptLineId], references: [id], onDelete: Cascade)
  destinationControl   WarehouseLocationControl  @relation(fields: [destinationControlId], references: [id], onDelete: Restrict)
  createdAt            DateTime                  @default(now())
  updatedAt            DateTime                  @updatedAt

  @@unique([tenantId, taskNumber])
  @@index([tenantId, status, createdAt])
  @@index([receivingSessionId])
  @@index([destinationControlId])
}

model WarehouseDiscrepancy {
  id                 String                      @id @default(cuid())
  tenantId           String
  receivingSessionId String
  receiptLineId      String?
  discrepancyType    WarehouseDiscrepancyType
  status             WarehouseDiscrepancyStatus  @default(OPEN)
  severity           RequisitionOrderExceptionSeverity @default(MEDIUM)
  title              String
  description        String?
  ownerUserId        String?
  resolution         String?
  resolvedAt         DateTime?
  receivingSession   WarehouseReceivingSession   @relation(fields: [receivingSessionId], references: [id], onDelete: Cascade)
  tenant             Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt          DateTime                    @default(now())
  updatedAt          DateTime                    @updatedAt

  @@index([tenantId, status, severity])
  @@index([receivingSessionId])
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

if "enum WarehouseReceivingStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  warehouseReceivingSessions WarehouseReceivingSession[]",
    "  warehouseLocationControls WarehouseLocationControl[]",
    "  putawayTasks PutawayTask[]",
    "  warehouseDiscrepancies WarehouseDiscrepancy[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model WarehouseReceivingSession {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Warehouse receiving and putaway schema applied.")
