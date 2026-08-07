from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum WarehouseFulfillmentStatus {
  DRAFT
  ALLOCATED
  PICKING
  PICKED
  PACKED
  ISSUED
  COMPLETED
  CANCELLED
  EXCEPTION
}

enum WarehousePickTaskStatus {
  OPEN
  IN_PROGRESS
  PICKED
  SHORT_PICK
  CANCELLED
}

enum WarehousePackStatus {
  OPEN
  PACKED
  CANCELLED
}

enum WarehouseFulfillmentExceptionType {
  INSUFFICIENT_STOCK
  SHORT_PICK
  WRONG_ITEM
  WRONG_LOCATION
  DAMAGED_STOCK
  SERIAL_LOT_MISMATCH
  PACKING_VARIANCE
  ISSUE_FAILURE
  OTHER
}

enum WarehouseFulfillmentExceptionStatus {
  OPEN
  INVESTIGATING
  RESOLVED
  WAIVED
  CANCELLED
}

"""

MODELS = """
model WarehouseFulfillmentOrder {
  id                  String                     @id @default(cuid())
  tenantId            String
  fulfillmentNumber   String
  status              WarehouseFulfillmentStatus @default(DRAFT)
  requestType         String?
  requestId           String?
  requestedByUserId   String?
  destinationType     String?
  destinationId       String?
  neededAt            DateTime?
  allocatedAt         DateTime?
  pickedAt            DateTime?
  packedAt            DateTime?
  issuedAt            DateTime?
  completedAt         DateTime?
  notes               String?
  tenant              Tenant                     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lines               WarehouseFulfillmentLine[]
  pickTasks           WarehousePickTask[]
  packages            WarehousePackage[]
  exceptions          WarehouseFulfillmentException[]
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt

  @@unique([tenantId, fulfillmentNumber])
  @@index([tenantId, status, createdAt])
  @@index([requestType, requestId])
}

model WarehouseFulfillmentLine {
  id                   String                    @id @default(cuid())
  fulfillmentOrderId   String
  lineReference        String
  inventoryItemId      String
  sourceLocationId     String
  requestedQuantity    Decimal                   @db.Decimal(18, 4)
  allocatedQuantity    Decimal                   @default(0) @db.Decimal(18, 4)
  pickedQuantity       Decimal                   @default(0) @db.Decimal(18, 4)
  issuedQuantity       Decimal                   @default(0) @db.Decimal(18, 4)
  unitOfMeasure        String                    @default("EA")
  serialLotReference   String?
  fulfillmentOrder     WarehouseFulfillmentOrder @relation(fields: [fulfillmentOrderId], references: [id], onDelete: Cascade)
  pickTasks            WarehousePickTask[]
  createdAt            DateTime                  @default(now())
  updatedAt            DateTime                  @updatedAt

  @@index([fulfillmentOrderId])
  @@index([inventoryItemId, sourceLocationId])
}

model WarehousePickTask {
  id                 String                    @id @default(cuid())
  tenantId           String
  taskNumber         String
  fulfillmentOrderId String
  fulfillmentLineId  String
  inventoryItemId    String
  sourceLocationId   String
  requestedQuantity  Decimal                   @db.Decimal(18, 4)
  pickedQuantity     Decimal                   @default(0) @db.Decimal(18, 4)
  unitOfMeasure      String                    @default("EA")
  status             WarehousePickTaskStatus   @default(OPEN)
  assignedUserId     String?
  startedAt          DateTime?
  completedAt        DateTime?
  tenant             Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  fulfillmentOrder   WarehouseFulfillmentOrder @relation(fields: [fulfillmentOrderId], references: [id], onDelete: Cascade)
  fulfillmentLine    WarehouseFulfillmentLine  @relation(fields: [fulfillmentLineId], references: [id], onDelete: Cascade)
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  @@unique([tenantId, taskNumber])
  @@index([tenantId, status, createdAt])
  @@index([fulfillmentOrderId])
}

model WarehousePackage {
  id                 String                    @id @default(cuid())
  tenantId           String
  packageNumber      String
  fulfillmentOrderId String
  status             WarehousePackStatus       @default(OPEN)
  packageType        String?
  grossWeight        Decimal?                  @db.Decimal(18, 4)
  weightUnit         String?
  carrierReference   String?
  trackingReference  String?
  packedByUserId     String?
  packedAt           DateTime?
  tenant             Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  fulfillmentOrder   WarehouseFulfillmentOrder @relation(fields: [fulfillmentOrderId], references: [id], onDelete: Cascade)
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  @@unique([tenantId, packageNumber])
  @@index([fulfillmentOrderId, status])
}

model WarehouseFulfillmentException {
  id                 String                              @id @default(cuid())
  tenantId           String
  fulfillmentOrderId String
  fulfillmentLineId  String?
  exceptionType      WarehouseFulfillmentExceptionType
  status             WarehouseFulfillmentExceptionStatus @default(OPEN)
  severity           RequisitionOrderExceptionSeverity  @default(MEDIUM)
  title              String
  description        String?
  ownerUserId        String?
  resolution         String?
  resolvedAt         DateTime?
  tenant             Tenant                              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  fulfillmentOrder   WarehouseFulfillmentOrder           @relation(fields: [fulfillmentOrderId], references: [id], onDelete: Cascade)
  createdAt          DateTime                            @default(now())
  updatedAt          DateTime                            @updatedAt

  @@index([tenantId, status, severity])
  @@index([fulfillmentOrderId])
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

if "enum WarehouseFulfillmentStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  warehouseFulfillmentOrders WarehouseFulfillmentOrder[]",
    "  warehousePickTasks WarehousePickTask[]",
    "  warehousePackages WarehousePackage[]",
    "  warehouseFulfillmentExceptions WarehouseFulfillmentException[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model WarehouseFulfillmentOrder {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Warehouse fulfillment schema applied.")
