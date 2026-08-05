from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum AssetStatus {
  PLANNED
  IN_SERVICE
  UNDER_MAINTENANCE
  OUT_OF_SERVICE
  RETIRED
  DISPOSED
  LOST
}

enum AssetCriticality {
  LOW
  MODERATE
  HIGH
  CRITICAL
}

enum AssetMaintenanceType {
  PREVENTIVE
  CORRECTIVE
  INSPECTION
  CALIBRATION
  WARRANTY
  UPGRADE
}

enum AssetMaintenanceStatus {
  PLANNED
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  OVERDUE
}

enum AssetAssignmentStatus {
  ACTIVE
  RETURNED
  TRANSFERRED
  LOST
}

"""

MODELS = """
model ProcurementAsset {
  id                    String           @id @default(cuid())
  tenantId              String
  assetNumber           String
  name                  String
  description           String?
  category              String
  status                AssetStatus      @default(PLANNED)
  criticality           AssetCriticality @default(MODERATE)
  serialNumber          String?
  manufacturer          String?
  modelNumber           String?
  purchaseOrderId       String?
  supplierId            String?
  inventoryItemId       String?
  siteId                String?
  location              String?
  acquisitionDate       DateTime?
  inServiceDate         DateTime?
  purchaseCost          Decimal?         @db.Decimal(18, 2)
  currencyCode          String           @default("USD")
  capitalizationDate    DateTime?
  usefulLifeMonths      Int?
  residualValue         Decimal?         @db.Decimal(18, 2)
  warrantyStartsAt      DateTime?
  warrantyEndsAt        DateTime?
  warrantyProvider      String?
  ownerUserId           String
  custodianUserId       String?
  retiredAt             DateTime?
  retirementReason      String?
  tenant                Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  assignments           AssetAssignment[]
  maintenancePlans      AssetMaintenancePlan[]
  maintenanceRecords    AssetMaintenanceRecord[]
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  @@unique([tenantId, assetNumber])
  @@index([tenantId, status, category])
  @@index([serialNumber])
}

model AssetAssignment {
  id              String                @id @default(cuid())
  procurementAssetId String
  assignedToUserId String
  assignedByUserId String
  assignedAt      DateTime              @default(now())
  expectedReturnAt DateTime?
  returnedAt      DateTime?
  status          AssetAssignmentStatus @default(ACTIVE)
  location        String?
  conditionAtIssue String?
  conditionAtReturn String?
  notes           String?
  asset           ProcurementAsset      @relation(fields: [procurementAssetId], references: [id], onDelete: Cascade)
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  @@index([procurementAssetId, status])
  @@index([assignedToUserId, status])
}

model AssetMaintenancePlan {
  id                    String                 @id @default(cuid())
  procurementAssetId    String
  name                  String
  type                  AssetMaintenanceType
  frequencyDays         Int
  nextDueAt             DateTime
  responsibleUserId     String
  instructions          String?
  active                Boolean                @default(true)
  asset                 ProcurementAsset       @relation(fields: [procurementAssetId], references: [id], onDelete: Cascade)
  records               AssetMaintenanceRecord[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@index([procurementAssetId, active, nextDueAt])
}

model AssetMaintenanceRecord {
  id                    String                  @id @default(cuid())
  procurementAssetId    String
  maintenancePlanId     String?
  type                  AssetMaintenanceType
  status                AssetMaintenanceStatus @default(PLANNED)
  scheduledAt           DateTime
  startedAt             DateTime?
  completedAt           DateTime?
  performedBy           String?
  vendorName            String?
  cost                  Decimal?                @db.Decimal(18, 2)
  currencyCode          String                  @default("USD")
  findings              String?
  workPerformed         String?
  partsUsed             String?
  downtimeHours         Decimal?                @db.Decimal(10, 2)
  evidenceUrl           String?
  approvedByUserId      String?
  asset                 ProcurementAsset        @relation(fields: [procurementAssetId], references: [id], onDelete: Cascade)
  plan                  AssetMaintenancePlan?   @relation(fields: [maintenancePlanId], references: [id], onDelete: SetNull)
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  @@index([procurementAssetId, status, scheduledAt])
}
"""

def bounds(text: str, model: str) -> tuple[int, int]:
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

def relation(model: str, line: str) -> None:
    global schema
    start, end = bounds(schema, model)
    block = schema[start:end]
    name = line.split()[0].strip()
    if name in block:
        return
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        anchor = block.find("\n  @@")
    if anchor < 0:
        raise SystemExit(f"Could not locate insertion anchor in {model}.")
    block = block[:anchor] + "\n" + line + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "enum AssetStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

relation("Tenant", "  procurementAssets ProcurementAsset[]")

if "model ProcurementAsset {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Asset lifecycle and equipment management schema applied.")
