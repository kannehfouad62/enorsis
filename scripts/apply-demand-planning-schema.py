from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum DemandPlanStatus {
  DRAFT
  ACTIVE
  LOCKED
  COMPLETED
  CANCELLED
}

enum DemandForecastMethod {
  MANUAL
  MOVING_AVERAGE
  WEIGHTED_AVERAGE
  SEASONAL
  CONSUMPTION_BASED
  IMPORTED
}

enum ReplenishmentRecommendationStatus {
  PROPOSED
  REVIEWED
  APPROVED
  REJECTED
  CONVERTED
  EXPIRED
}

"""

MODELS = """
model DemandPlan {
  id                  String           @id @default(cuid())
  tenantId            String
  name                String
  description         String?
  status              DemandPlanStatus @default(DRAFT)
  periodStart         DateTime
  periodEnd           DateTime
  planningHorizonDays Int
  ownerUserId         String
  approvedByUserId    String?
  approvedAt          DateTime?
  lockedAt            DateTime?
  completedAt         DateTime?
  tenant              Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  forecasts           DemandForecast[]
  recommendations     ReplenishmentRecommendation[]
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  @@unique([tenantId, name, periodStart, periodEnd])
  @@index([tenantId, status, periodEnd])
}

model DemandForecast {
  id                    String               @id @default(cuid())
  demandPlanId          String
  inventoryItemId       String
  method                DemandForecastMethod @default(MANUAL)
  forecastQuantity      Decimal              @db.Decimal(18, 4)
  historicalConsumption Decimal?             @db.Decimal(18, 4)
  committedDemand       Decimal              @default(0) @db.Decimal(18, 4)
  safetyStockDemand     Decimal              @default(0) @db.Decimal(18, 4)
  confidencePercent     Int                  @default(50)
  assumptions           String?
  plan                  DemandPlan           @relation(fields: [demandPlanId], references: [id], onDelete: Cascade)
  inventoryItem         InventoryItem        @relation(fields: [inventoryItemId], references: [id], onDelete: Restrict)
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt

  @@unique([demandPlanId, inventoryItemId])
}

model ReplenishmentRecommendation {
  id                   String                          @id @default(cuid())
  tenantId             String
  demandPlanId         String
  inventoryItemId      String
  status               ReplenishmentRecommendationStatus @default(PROPOSED)
  currentAvailable     Decimal                         @db.Decimal(18, 4)
  forecastDemand       Decimal                         @db.Decimal(18, 4)
  safetyStock          Decimal                         @db.Decimal(18, 4)
  recommendedQuantity  Decimal                         @db.Decimal(18, 4)
  recommendedOrderDate DateTime
  expectedDeliveryDate DateTime?
  estimatedUnitCost    Decimal?                        @db.Decimal(18, 4)
  estimatedTotalCost   Decimal?                        @db.Decimal(18, 2)
  preferredSupplierId  String?
  purchaseRequestId    String?
  reviewedByUserId     String?
  reviewedAt           DateTime?
  approvedByUserId     String?
  approvedAt           DateTime?
  rejectionReason      String?
  tenant               Tenant                          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  plan                 DemandPlan                      @relation(fields: [demandPlanId], references: [id], onDelete: Cascade)
  inventoryItem        InventoryItem                   @relation(fields: [inventoryItemId], references: [id], onDelete: Restrict)
  createdAt            DateTime                        @default(now())
  updatedAt            DateTime                        @updatedAt

  @@unique([demandPlanId, inventoryItemId])
  @@index([tenantId, status, recommendedOrderDate])
}
"""

def model_bounds(text: str, model_name: str) -> tuple[int, int]:
    start = text.find(f"model {model_name} {{")
    if start == -1:
        raise SystemExit(f"Could not locate {model_name} model.")
    opening = text.find("{", start)
    depth = 0
    for index in range(opening, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return start, index
    raise SystemExit(f"Could not locate the end of {model_name} model.")

def insert_relation(model_name: str, relation_line: str) -> None:
    global schema
    start, end = model_bounds(schema, model_name)
    block = schema[start:end]
    relation_name = relation_line.split()[0].strip()
    if relation_name in block:
        return
    anchor = block.find("\n  createdAt")
    if anchor == -1:
        anchor = block.find("\n  @@")
    if anchor == -1:
        raise SystemExit(f"Could not locate insertion anchor in {model_name}.")
    block = block[:anchor] + "\n" + relation_line + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "enum DemandPlanStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

insert_relation("Tenant", "  demandPlans DemandPlan[]")
insert_relation("Tenant", "  replenishmentRecommendations ReplenishmentRecommendation[]")
insert_relation("InventoryItem", "  demandForecasts DemandForecast[]")
insert_relation("InventoryItem", "  replenishmentRecommendations ReplenishmentRecommendation[]")

if "model DemandPlan {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Demand planning and replenishment schema applied.")
