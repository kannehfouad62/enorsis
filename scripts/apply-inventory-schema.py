from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

enums = """enum InventoryLocationStatus {
  ACTIVE
  INACTIVE
}

enum InventoryItemStatus {
  ACTIVE
  INACTIVE
  OBSOLETE
}

enum InventoryTransactionType {
  RECEIPT
  ISSUE
  TRANSFER_IN
  TRANSFER_OUT
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  RETURN_TO_STOCK
  RETURN_TO_SUPPLIER
}

enum CycleCountStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

"""

if "enum InventoryLocationStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_start = schema.find("model Tenant {")
if tenant_start == -1:
    raise SystemExit("Could not locate Tenant model.")

tenant_end = schema.find("\n}", tenant_start)
if tenant_end == -1:
    raise SystemExit("Could not locate the end of Tenant model.")

tenant_block = schema[tenant_start:tenant_end]
relations = [
    "  inventoryLocations    InventoryLocation[]",
    "  inventoryItems        InventoryItem[]",
    "  inventoryTransactions InventoryTransaction[]",
    "  cycleCounts           CycleCount[]",
]
missing = [line for line in relations if line.split()[0].strip() not in tenant_block]

if missing:
    anchor = tenant_block.find("\n  createdAt")
    if anchor == -1:
        raise SystemExit("Could not locate Tenant.createdAt insertion anchor.")
    tenant_block = tenant_block[:anchor] + "\n" + "\n".join(missing) + tenant_block[anchor:]
    schema = schema[:tenant_start] + tenant_block + schema[tenant_end:]

if "model InventoryLocation {" not in schema:
    schema += """

model InventoryLocation {
  id          String                  @id @default(cuid())
  tenantId    String
  code        String
  name        String
  description String?
  siteId      String?
  address     String?
  status      InventoryLocationStatus @default(ACTIVE)
  ownerUserId String
  tenant      Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  balances    InventoryBalance[]
  cycleCounts CycleCount[]
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId, status, name])
}

model InventoryItem {
  id                  String              @id @default(cuid())
  tenantId            String
  sku                 String
  name                String
  description         String?
  category            String
  unitOfMeasure       String
  status              InventoryItemStatus @default(ACTIVE)
  catalogItemId       String?
  manufacturer        String?
  manufacturerPartNo  String?
  preferredSupplierId String?
  standardCost        Decimal?            @db.Decimal(18, 4)
  reorderPoint        Decimal             @default(0) @db.Decimal(18, 4)
  reorderQuantity     Decimal             @default(0) @db.Decimal(18, 4)
  safetyStock         Decimal             @default(0) @db.Decimal(18, 4)
  leadTimeDays        Int?
  lotControlled       Boolean             @default(false)
  serialControlled    Boolean             @default(false)
  tenant              Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  balances            InventoryBalance[]
  transactions        InventoryTransaction[]
  countLines          CycleCountLine[]
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@unique([tenantId, sku])
  @@index([tenantId, status, category])
}

model InventoryBalance {
  id                  String            @id @default(cuid())
  inventoryItemId     String
  inventoryLocationId String
  quantityOnHand      Decimal           @default(0) @db.Decimal(18, 4)
  quantityReserved    Decimal           @default(0) @db.Decimal(18, 4)
  quantityAvailable   Decimal           @default(0) @db.Decimal(18, 4)
  averageUnitCost     Decimal?          @db.Decimal(18, 4)
  lastCountedAt       DateTime?
  item                InventoryItem     @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  location            InventoryLocation @relation(fields: [inventoryLocationId], references: [id], onDelete: Cascade)
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@unique([inventoryItemId, inventoryLocationId])
  @@index([inventoryLocationId, quantityAvailable])
}

model InventoryTransaction {
  id                    String                   @id @default(cuid())
  tenantId              String
  inventoryItemId       String
  inventoryLocationId   String
  destinationLocationId String?
  type                  InventoryTransactionType
  quantity              Decimal                  @db.Decimal(18, 4)
  unitCost              Decimal?                 @db.Decimal(18, 4)
  referenceType         String?
  referenceId           String?
  reason                String?
  lotNumber             String?
  serialNumber          String?
  performedByUserId     String
  performedAt           DateTime                 @default(now())
  tenant                Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  item                  InventoryItem            @relation(fields: [inventoryItemId], references: [id], onDelete: Restrict)
  createdAt             DateTime                 @default(now())

  @@index([tenantId, performedAt])
  @@index([inventoryItemId, inventoryLocationId, performedAt])
}

model CycleCount {
  id                  String            @id @default(cuid())
  tenantId            String
  inventoryLocationId String
  countNumber         String
  status              CycleCountStatus  @default(DRAFT)
  scheduledAt         DateTime
  startedAt           DateTime?
  completedAt         DateTime?
  ownerUserId         String
  approvedByUserId    String?
  notes               String?
  tenant              Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  location            InventoryLocation @relation(fields: [inventoryLocationId], references: [id], onDelete: Cascade)
  lines               CycleCountLine[]
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@unique([tenantId, countNumber])
  @@index([tenantId, status, scheduledAt])
}

model CycleCountLine {
  id               String        @id @default(cuid())
  cycleCountId     String
  inventoryItemId  String
  expectedQuantity Decimal       @db.Decimal(18, 4)
  countedQuantity  Decimal?      @db.Decimal(18, 4)
  varianceQuantity Decimal?      @db.Decimal(18, 4)
  varianceValue    Decimal?      @db.Decimal(18, 2)
  comments         String?
  countedByUserId  String?
  countedAt        DateTime?
  cycleCount       CycleCount    @relation(fields: [cycleCountId], references: [id], onDelete: Cascade)
  item             InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Restrict)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@unique([cycleCountId, inventoryItemId])
}
"""

path.write_text(schema)
print("Inventory and materials management schema applied.")
