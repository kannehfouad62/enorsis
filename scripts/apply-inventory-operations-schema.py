from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum InventoryMovementType {
  RECEIPT
  ISSUE
  TRANSFER
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  RETURN
  SCRAP
  CYCLE_COUNT
}

enum InventoryMovementStatus {
  DRAFT
  POSTED
  CANCELLED
  REVERSED
}

enum InventoryReservationStatus {
  ACTIVE
  PARTIALLY_FULFILLED
  FULFILLED
  RELEASED
  EXPIRED
  CANCELLED
}

enum InventoryOperationExceptionStatus {
  OPEN
  INVESTIGATING
  RESOLVED
  WAIVED
  CANCELLED
}

enum InventoryOperationExceptionType {
  NEGATIVE_STOCK
  INSUFFICIENT_AVAILABILITY
  LOCATION_MISMATCH
  ITEM_MISMATCH
  QUANTITY_VARIANCE
  SERIAL_LOT_REQUIRED
  EXPIRED_STOCK
  DAMAGED_STOCK
  OTHER
}

'''

MODELS = '''
model InventoryMovementLedger {
  id                  String                   @id @default(cuid())
  tenantId            String
  movementNumber      String
  movementType        InventoryMovementType
  status              InventoryMovementStatus  @default(DRAFT)
  inventoryItemId     String
  fromLocationId      String?
  toLocationId        String?
  quantity            Decimal                  @db.Decimal(18, 4)
  unitOfMeasure       String                   @default("EA")
  unitCost            Decimal?                 @db.Decimal(18, 4)
  currencyCode        String                   @default("USD")
  referenceType       String?
  referenceId         String?
  serialLotReference  String?
  reason              String?
  occurredAt          DateTime                 @default(now())
  postedAt            DateTime?
  postedByUserId      String?
  createdByUserId     String?
  reversalOfId        String?
  tenant              Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  exceptions          InventoryOperationException[]
  createdAt           DateTime                 @default(now())
  updatedAt           DateTime                 @updatedAt

  @@unique([tenantId, movementNumber])
  @@index([tenantId, status, occurredAt])
  @@index([inventoryItemId])
  @@index([fromLocationId])
  @@index([toLocationId])
  @@index([referenceType, referenceId])
}

model InventoryAvailabilitySnapshot {
  id                 String   @id @default(cuid())
  tenantId           String
  inventoryItemId    String
  locationId         String
  onHandQuantity     Decimal  @default(0) @db.Decimal(18, 4)
  reservedQuantity   Decimal  @default(0) @db.Decimal(18, 4)
  availableQuantity  Decimal  @default(0) @db.Decimal(18, 4)
  inTransitQuantity  Decimal  @default(0) @db.Decimal(18, 4)
  damagedQuantity    Decimal  @default(0) @db.Decimal(18, 4)
  lastMovementAt     DateTime?
  tenant             Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, inventoryItemId, locationId])
  @@index([tenantId, locationId])
  @@index([inventoryItemId])
}

model InventoryReservation {
  id                  String                     @id @default(cuid())
  tenantId            String
  reservationNumber   String
  inventoryItemId     String
  locationId          String
  requestedQuantity   Decimal                    @db.Decimal(18, 4)
  fulfilledQuantity   Decimal                    @default(0) @db.Decimal(18, 4)
  status              InventoryReservationStatus @default(ACTIVE)
  referenceType       String?
  referenceId         String?
  requiredAt          DateTime?
  expiresAt           DateTime?
  requestedByUserId   String?
  tenant              Tenant                     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt

  @@unique([tenantId, reservationNumber])
  @@index([tenantId, status, requiredAt])
  @@index([inventoryItemId, locationId])
}

model InventoryOperationException {
  id                String                             @id @default(cuid())
  tenantId          String
  movementLedgerId  String?
  exceptionType     InventoryOperationExceptionType
  status            InventoryOperationExceptionStatus @default(OPEN)
  severity          RequisitionOrderExceptionSeverity @default(MEDIUM)
  title             String
  description       String?
  ownerUserId       String?
  dueAt             DateTime?
  resolution        String?
  resolvedAt        DateTime?
  tenant            Tenant                             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  movementLedger    InventoryMovementLedger?           @relation(fields: [movementLedgerId], references: [id], onDelete: Cascade)
  createdAt         DateTime                           @default(now())
  updatedAt         DateTime                           @updatedAt

  @@index([tenantId, status, severity])
  @@index([movementLedgerId])
}
'''

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

if "enum InventoryMovementType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  inventoryMovementLedgers InventoryMovementLedger[]",
    "  inventoryAvailabilitySnapshots InventoryAvailabilitySnapshot[]",
    "  inventoryReservations InventoryReservation[]",
    "  inventoryOperationExceptions InventoryOperationException[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model InventoryMovementLedger {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Inventory operations schema applied.")
