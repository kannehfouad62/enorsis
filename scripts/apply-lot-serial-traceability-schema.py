from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum InventoryTraceUnitType {
  LOT
  SERIAL
}

enum InventoryTraceUnitStatus {
  ACTIVE
  QUARANTINED
  EXPIRED
  RECALLED
  CONSUMED
  SCRAPPED
  CLOSED
}

enum InventoryTraceEventType {
  CREATED
  RECEIVED
  PUTAWAY
  TRANSFERRED
  RESERVED
  PICKED
  ISSUED
  ADJUSTED
  QUARANTINED
  RELEASED
  RECALLED
  EXPIRED
  SCRAPPED
  COUNTED
}

enum InventoryTraceHoldStatus {
  ACTIVE
  RELEASED
  CANCELLED
}

enum InventoryTraceHoldType {
  QUALITY
  EXPIRY
  RECALL
  COMPLIANCE
  INVESTIGATION
  OTHER
}

"""

MODELS = """
model InventoryTraceUnit {
  id                 String                   @id @default(cuid())
  tenantId           String
  traceNumber        String
  unitType           InventoryTraceUnitType
  status             InventoryTraceUnitStatus @default(ACTIVE)
  inventoryItemId    String
  lotNumber          String?
  serialNumber       String?
  currentLocationId  String?
  quantity           Decimal                  @default(1) @db.Decimal(18, 4)
  unitOfMeasure      String                   @default("EA")
  manufactureDate    DateTime?
  receivedDate       DateTime?
  expiryDate         DateTime?
  supplierId         String?
  sourceReferenceType String?
  sourceReferenceId  String?
  notes              String?
  tenant             Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  events             InventoryTraceEvent[]
  holds              InventoryTraceHold[]
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt

  @@unique([tenantId, traceNumber])
  @@unique([tenantId, inventoryItemId, serialNumber])
  @@index([tenantId, status, expiryDate])
  @@index([inventoryItemId, lotNumber])
  @@index([currentLocationId])
}

model InventoryTraceEvent {
  id                 String                  @id @default(cuid())
  tenantId           String
  traceUnitId        String
  eventType          InventoryTraceEventType
  movementLedgerId   String?
  referenceType      String?
  referenceId        String?
  fromLocationId     String?
  toLocationId       String?
  quantity           Decimal?                @db.Decimal(18, 4)
  eventAt            DateTime                @default(now())
  actorUserId        String?
  notes              String?
  tenant             Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  traceUnit          InventoryTraceUnit      @relation(fields: [traceUnitId], references: [id], onDelete: Cascade)
  createdAt          DateTime                @default(now())

  @@index([tenantId, eventAt])
  @@index([traceUnitId, eventAt])
  @@index([movementLedgerId])
  @@index([referenceType, referenceId])
}

model InventoryTraceHold {
  id                 String                   @id @default(cuid())
  tenantId           String
  traceUnitId        String
  holdType           InventoryTraceHoldType
  status             InventoryTraceHoldStatus @default(ACTIVE)
  title              String
  description        String?
  ownerUserId        String?
  releasedByUserId   String?
  releasedAt         DateTime?
  releaseReason      String?
  tenant             Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  traceUnit          InventoryTraceUnit       @relation(fields: [traceUnitId], references: [id], onDelete: Cascade)
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt

  @@index([tenantId, status, holdType])
  @@index([traceUnitId, status])
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

if "enum InventoryTraceUnitType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  inventoryTraceUnits InventoryTraceUnit[]",
    "  inventoryTraceEvents InventoryTraceEvent[]",
    "  inventoryTraceHolds InventoryTraceHold[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model InventoryTraceUnit {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Lot, serial, expiry and traceability schema applied.")
