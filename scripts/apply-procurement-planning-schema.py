from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum ProcurementPlanStatus" not in schema:
    anchor = "enum AuditActorType {"
    enums = """enum ProcurementPlanStatus {
  DRAFT
  ACTIVE
  COMPLETED
  CANCELLED
}

enum CategoryStrategyStatus {
  DRAFT
  ACTIVE
  UNDER_REVIEW
  COMPLETED
  CANCELLED
}

enum SavingsInitiativeStatus {
  IDEA
  VALIDATED
  APPROVED
  IN_EXECUTION
  REALIZED
  CANCELLED
}

enum SavingsInitiativeType {
  COST_REDUCTION
  COST_AVOIDANCE
  WORKING_CAPITAL
  DEMAND_REDUCTION
  PROCESS_EFFICIENCY
  RISK_AVOIDANCE
}

enum SavingsMilestoneStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  BLOCKED
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_pattern = re.compile(r"(model Tenant \{.*?)(\n\s+createdAt\s+DateTime)", re.DOTALL)
tenant_match = tenant_pattern.search(schema)
if not tenant_match:
    raise SystemExit("Could not locate Tenant model.")

tenant_block = tenant_match.group(1)
for relation in [
    "procurementPlans       ProcurementPlan[]",
    "categoryStrategies     CategoryStrategy[]",
    "savingsInitiatives     SavingsInitiative[]",
]:
    name = relation.split()[0]
    if name not in tenant_block:
        tenant_block += f"\n  {relation}"

schema = schema[:tenant_match.start(1)] + tenant_block + schema[tenant_match.end(1):]

if "model ProcurementPlan {" not in schema:
    schema += r"""

model ProcurementPlan {
  id                    String                @id @default(cuid())
  tenantId              String
  name                  String
  fiscalYear            Int
  status                ProcurementPlanStatus @default(DRAFT)
  objective             String
  approvedBudget        Decimal               @db.Decimal(18, 2)
  committedSpend        Decimal               @default(0) @db.Decimal(18, 2)
  actualSpend           Decimal               @default(0) @db.Decimal(18, 2)
  savingsTarget         Decimal               @default(0) @db.Decimal(18, 2)
  realizedSavings       Decimal               @default(0) @db.Decimal(18, 2)
  ownerUserId           String
  approvedByUserId      String?
  approvedAt            DateTime?
  completedAt           DateTime?
  tenant                Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  categoryStrategies    CategoryStrategy[]
  savingsInitiatives    SavingsInitiative[]
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  @@unique([tenantId, fiscalYear, name])
  @@index([tenantId, status, fiscalYear])
}

model CategoryStrategy {
  id                    String                 @id @default(cuid())
  tenantId              String
  procurementPlanId     String?
  category              String
  name                  String
  status                CategoryStrategyStatus @default(DRAFT)
  ownerUserId           String
  currentSpend          Decimal                @default(0) @db.Decimal(18, 2)
  addressableSpend      Decimal                @default(0) @db.Decimal(18, 2)
  savingsTarget         Decimal                @default(0) @db.Decimal(18, 2)
  supplierCount         Int                    @default(0)
  riskSummary           String?
  marketSummary         String?
  strategySummary       String
  sourcingApproach      String?
  contractApproach      String?
  supplierApproach      String?
  startsAt              DateTime
  targetCompletionAt    DateTime
  completedAt           DateTime?
  tenant                Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  procurementPlan       ProcurementPlan?       @relation(fields: [procurementPlanId], references: [id], onDelete: SetNull)
  savingsInitiatives    SavingsInitiative[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@unique([tenantId, name])
  @@index([tenantId, status, category])
  @@index([procurementPlanId])
}

model SavingsInitiative {
  id                    String                  @id @default(cuid())
  tenantId              String
  procurementPlanId     String?
  categoryStrategyId    String?
  initiativeNumber      String
  name                  String
  description           String
  type                  SavingsInitiativeType
  status                SavingsInitiativeStatus @default(IDEA)
  category              String?
  ownerUserId           String
  baselineAmount        Decimal                 @db.Decimal(18, 2)
  targetSavings         Decimal                 @db.Decimal(18, 2)
  validatedSavings      Decimal                 @default(0) @db.Decimal(18, 2)
  realizedSavings       Decimal                 @default(0) @db.Decimal(18, 2)
  currencyCode          String                  @default("USD")
  confidencePercent     Int                     @default(50)
  financeValidatedBy    String?
  financeValidatedAt    DateTime?
  startsAt              DateTime
  targetRealizationAt   DateTime
  realizedAt            DateTime?
  sourceType            String?
  sourceId              String?
  assumptions           String?
  risks                 String?
  tenant                Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  procurementPlan       ProcurementPlan?        @relation(fields: [procurementPlanId], references: [id], onDelete: SetNull)
  categoryStrategy      CategoryStrategy?       @relation(fields: [categoryStrategyId], references: [id], onDelete: SetNull)
  milestones            SavingsMilestone[]
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  @@unique([tenantId, initiativeNumber])
  @@index([tenantId, status, targetRealizationAt])
  @@index([procurementPlanId])
  @@index([categoryStrategyId])
}

model SavingsMilestone {
  id                    String                 @id @default(cuid())
  savingsInitiativeId   String
  name                  String
  description           String?
  status                SavingsMilestoneStatus @default(NOT_STARTED)
  ownerUserId           String
  dueAt                 DateTime
  completedAt           DateTime?
  evidence              Json?
  initiative            SavingsInitiative      @relation(fields: [savingsInitiativeId], references: [id], onDelete: Cascade)
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@index([savingsInitiativeId, status, dueAt])
}
"""

path.write_text(schema)
print("Procurement planning and savings schema applied.")
