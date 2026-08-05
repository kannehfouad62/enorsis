from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum CategoryStrategyStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  ACTIVE
  COMPLETED
  RETIRED
}

enum CategoryOpportunityType {
  SOURCING
  RENEGOTIATION
  DEMAND_MANAGEMENT
  SPECIFICATION_OPTIMIZATION
  SUPPLIER_CONSOLIDATION
  PROCESS_IMPROVEMENT
  RISK_REDUCTION
  SUSTAINABILITY
  OTHER
}

enum CategoryOpportunityStatus {
  IDENTIFIED
  QUALIFYING
  APPROVED
  IN_PROGRESS
  REALIZED
  CANCELLED
}

enum MarketSignalType {
  PRICE
  CAPACITY
  SUPPLY_RISK
  REGULATORY
  TECHNOLOGY
  GEOPOLITICAL
  SUSTAINABILITY
  LABOR
  OTHER
}

enum MarketSignalDirection {
  POSITIVE
  NEUTRAL
  NEGATIVE
}

"""

MODELS = """
model CategoryStrategy {
  id                    String                 @id @default(cuid())
  tenantId              String
  categoryCode          String
  categoryName          String
  title                 String
  description           String
  status                CategoryStrategyStatus @default(DRAFT)
  ownerUserId           String
  executiveSponsorUserId String?
  periodStart           DateTime
  periodEnd             DateTime
  currencyCode          String                 @default("USD")
  addressableSpend      Decimal                @default(0) @db.Decimal(18, 2)
  managedSpend          Decimal                @default(0) @db.Decimal(18, 2)
  supplierCount         Int                    @default(0)
  preferredSupplierCount Int                   @default(0)
  savingsTarget         Decimal                @default(0) @db.Decimal(18, 2)
  riskSummary           String?
  demandDrivers         String?
  supplyMarketSummary   String?
  strategicObjectives   String?
  approvedByUserId      String?
  approvedAt            DateTime?
  tenant                Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  opportunities         CategoryOpportunity[]
  marketSignals         CategoryMarketSignal[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@unique([tenantId, categoryCode, periodStart, periodEnd])
  @@index([tenantId, status, periodEnd])
}

model CategoryOpportunity {
  id                    String                    @id @default(cuid())
  categoryStrategyId    String
  title                 String
  description           String
  type                  CategoryOpportunityType
  status                CategoryOpportunityStatus @default(IDENTIFIED)
  estimatedValue        Decimal                   @default(0) @db.Decimal(18, 2)
  probabilityPercent    Int                       @default(50)
  complexityScore       Int                       @default(3)
  riskScore             Int                       @default(3)
  ownerUserId           String
  targetStartAt         DateTime?
  targetCompletionAt    DateTime?
  sourcingEventId       String?
  contractId            String?
  valueInitiativeId     String?
  assumptions           String?
  blockers              String?
  strategy              CategoryStrategy          @relation(fields: [categoryStrategyId], references: [id], onDelete: Cascade)
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  @@index([categoryStrategyId, status, targetCompletionAt])
}

model CategoryMarketSignal {
  id                    String                @id @default(cuid())
  categoryStrategyId    String
  type                  MarketSignalType
  direction             MarketSignalDirection
  title                 String
  description           String
  source                String?
  sourceUrl             String?
  confidencePercent     Int                   @default(50)
  impactScore           Int                   @default(3)
  observedAt            DateTime
  expiresAt             DateTime?
  strategy              CategoryStrategy      @relation(fields: [categoryStrategyId], references: [id], onDelete: Cascade)
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  @@index([categoryStrategyId, type, observedAt])
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

if "enum CategoryStrategyStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

relation("Tenant", "  categoryStrategies CategoryStrategy[]")

if "model CategoryStrategy {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Category management and market intelligence schema applied.")
