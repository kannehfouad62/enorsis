from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ReplenishmentPolicyStatus {
  ACTIVE
  PAUSED
  DISABLED
}

enum StockReplenishmentRecommendationStatus {
  OPEN
  APPROVED
  TRANSFER_CREATED
  DISMISSED
  CANCELLED
}

enum StockTransferStatus {
  DRAFT
  APPROVED
  PICKING
  IN_TRANSIT
  RECEIVED
  COMPLETED
  CANCELLED
  EXCEPTION
}

enum StockTransferExceptionStatus {
  OPEN
  INVESTIGATING
  RESOLVED
  WAIVED
  CANCELLED
}

enum StockTransferExceptionType {
  INSUFFICIENT_SOURCE_STOCK
  DESTINATION_CAPACITY
  TRACEABILITY_HOLD
  QUANTITY_VARIANCE
  LOCATION_BLOCKED
  OTHER
}

"""

MODELS = """
model ReplenishmentPolicy {
  id                   String                      @id @default(cuid())
  tenantId             String
  inventoryItemId      String
  locationId           String
  status               ReplenishmentPolicyStatus   @default(ACTIVE)
  minimumQuantity      Decimal                     @db.Decimal(18, 4)
  maximumQuantity      Decimal                     @db.Decimal(18, 4)
  reorderQuantity      Decimal?                    @db.Decimal(18, 4)
  sourceLocationId     String?
  leadTimeDays         Int                         @default(0)
  safetyStockQuantity  Decimal                     @default(0) @db.Decimal(18, 4)
  unitOfMeasure        String                      @default("EA")
  tenant               Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  recommendations      StockReplenishmentRecommendation[]
  createdAt            DateTime                    @default(now())
  updatedAt            DateTime                    @updatedAt

  @@unique([tenantId, inventoryItemId, locationId])
  @@index([tenantId, status])
  @@index([sourceLocationId])
}

model StockReplenishmentRecommendation {
  id                   String                            @id @default(cuid())
  tenantId             String
  policyId             String
  recommendationNumber String
  status               StockReplenishmentRecommendationStatus @default(OPEN)
  inventoryItemId      String
  sourceLocationId     String?
  destinationLocationId String
  currentQuantity      Decimal                           @db.Decimal(18, 4)
  minimumQuantity      Decimal                           @db.Decimal(18, 4)
  maximumQuantity      Decimal                           @db.Decimal(18, 4)
  recommendedQuantity  Decimal                           @db.Decimal(18, 4)
  reason               String?
  approvedByUserId     String?
  approvedAt           DateTime?
  stockTransferId      String?
  tenant               Tenant                            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  policy               ReplenishmentPolicy               @relation(fields: [policyId], references: [id], onDelete: Cascade)
  createdAt            DateTime                          @default(now())
  updatedAt            DateTime                          @updatedAt

  @@unique([tenantId, recommendationNumber])
  @@index([tenantId, status, createdAt])
  @@index([inventoryItemId, destinationLocationId])
}

model StockTransferOrder {
  id                    String              @id @default(cuid())
  tenantId              String
  transferNumber        String
  status                StockTransferStatus @default(DRAFT)
  inventoryItemId       String
  sourceLocationId      String
  destinationLocationId String
  requestedQuantity     Decimal             @db.Decimal(18, 4)
  shippedQuantity       Decimal             @default(0) @db.Decimal(18, 4)
  receivedQuantity      Decimal             @default(0) @db.Decimal(18, 4)
  unitOfMeasure         String              @default("EA")
  recommendationId      String?
  requestedByUserId     String?
  approvedByUserId      String?
  shippedByUserId       String?
  receivedByUserId      String?
  requestedAt           DateTime            @default(now())
  approvedAt            DateTime?
  shippedAt             DateTime?
  receivedAt            DateTime?
  completedAt           DateTime?
  outboundMovementId    String?
  inboundMovementId     String?
  notes                 String?
  tenant                Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  exceptions            StockTransferException[]
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@unique([tenantId, transferNumber])
  @@index([tenantId, status, createdAt])
  @@index([inventoryItemId])
  @@index([sourceLocationId])
  @@index([destinationLocationId])
}

model StockTransferException {
  id              String                       @id @default(cuid())
  tenantId        String
  stockTransferId String
  exceptionType   StockTransferExceptionType
  status          StockTransferExceptionStatus @default(OPEN)
  severity        RequisitionOrderExceptionSeverity @default(MEDIUM)
  title           String
  description     String?
  ownerUserId     String?
  resolution      String?
  resolvedAt      DateTime?
  tenant          Tenant                       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  stockTransfer   StockTransferOrder           @relation(fields: [stockTransferId], references: [id], onDelete: Cascade)
  createdAt       DateTime                     @default(now())
  updatedAt       DateTime                     @updatedAt

  @@index([tenantId, status, severity])
  @@index([stockTransferId])
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

if "enum ReplenishmentPolicyStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  replenishmentPolicies ReplenishmentPolicy[]",
    "  replenishmentRecommendations StockReplenishmentRecommendation[]",
    "  stockTransferOrders StockTransferOrder[]",
    "  stockTransferExceptions StockTransferException[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model ReplenishmentPolicy {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Replenishment and stock transfer schema applied.")
