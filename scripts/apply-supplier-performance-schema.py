from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum SupplierScorecardStatus" not in schema:
    anchor = "enum AuditActorType {"
    enums = """enum SupplierScorecardStatus {
  DRAFT
  IN_REVIEW
  PUBLISHED
  SUPERSEDED
}

enum SupplierPerformanceRating {
  EXCEPTIONAL
  STRONG
  ACCEPTABLE
  NEEDS_IMPROVEMENT
  CRITICAL
}

enum SupplierKpiCategory {
  DELIVERY
  QUALITY
  COST
  SERVICE
  INNOVATION
  ESG
  RISK
  COMPLIANCE
}

enum SupplierDevelopmentPlanStatus {
  DRAFT
  ACTIVE
  COMPLETED
  CANCELLED
}

enum SupplierCorrectiveActionStatus {
  OPEN
  SUPPLIER_RESPONSE_REQUIRED
  UNDER_REVIEW
  IMPLEMENTATION
  VERIFICATION
  CLOSED
  REJECTED
}

enum SupplierCorrectiveActionSeverity {
  LOW
  MODERATE
  HIGH
  CRITICAL
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
    "supplierScorecards     SupplierScorecard[]",
    "supplierDevelopmentPlans SupplierDevelopmentPlan[]",
    "supplierCorrectiveActions SupplierCorrectiveAction[]",
]:
    name = relation.split()[0]
    if name not in tenant_block:
        tenant_block += f"\n  {relation}"

schema = schema[:tenant_match.start(1)] + tenant_block + schema[tenant_match.end(1):]

supplier_pattern = re.compile(r"(model Supplier \{.*?)(\n\s+@@unique)", re.DOTALL)
supplier_match = supplier_pattern.search(schema)
if not supplier_match:
    raise SystemExit("Could not locate Supplier model.")

supplier_block = supplier_match.group(1)
for relation in [
    "scorecards            SupplierScorecard[]",
    "developmentPlans      SupplierDevelopmentPlan[]",
    "correctiveActions     SupplierCorrectiveAction[]",
]:
    name = relation.split()[0]
    if name not in supplier_block:
        supplier_block += f"\n  {relation}"

schema = schema[:supplier_match.start(1)] + supplier_block + schema[supplier_match.end(1):]

if "model SupplierScorecard {" not in schema:
    schema += r"""

model SupplierScorecard {
  id                    String                    @id @default(cuid())
  tenantId              String
  supplierId            String
  periodStart           DateTime
  periodEnd             DateTime
  status                SupplierScorecardStatus   @default(DRAFT)
  rating                SupplierPerformanceRating
  overallScore          Decimal                   @db.Decimal(8, 2)
  deliveryScore         Decimal                   @db.Decimal(8, 2)
  qualityScore          Decimal                   @db.Decimal(8, 2)
  costScore             Decimal                   @db.Decimal(8, 2)
  serviceScore          Decimal                   @db.Decimal(8, 2)
  innovationScore       Decimal                   @db.Decimal(8, 2)
  esgScore              Decimal                   @db.Decimal(8, 2)
  riskScore             Decimal                   @db.Decimal(8, 2)
  complianceScore       Decimal                   @db.Decimal(8, 2)
  executiveSummary      String?
  strengths             String?
  concerns              String?
  createdByUserId       String
  reviewedByUserId      String?
  publishedByUserId     String?
  reviewedAt            DateTime?
  publishedAt           DateTime?
  tenant                Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier              Supplier                  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  kpis                   SupplierKpiResult[]
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  @@unique([supplierId, periodStart, periodEnd])
  @@index([tenantId, status, periodEnd])
  @@index([supplierId, periodEnd])
}

model SupplierKpiResult {
  id                    String              @id @default(cuid())
  scorecardId           String
  category              SupplierKpiCategory
  key                   String
  name                  String
  description           String?
  targetValue           Decimal?            @db.Decimal(18, 4)
  actualValue           Decimal?            @db.Decimal(18, 4)
  unit                  String?
  weight                Decimal             @db.Decimal(8, 2)
  score                 Decimal             @db.Decimal(8, 2)
  dataSource             String?
  evidence               Json?
  scorecard             SupplierScorecard   @relation(fields: [scorecardId], references: [id], onDelete: Cascade)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@unique([scorecardId, key])
  @@index([scorecardId, category])
}

model SupplierDevelopmentPlan {
  id                    String                        @id @default(cuid())
  tenantId              String
  supplierId            String
  title                 String
  objective             String
  status                SupplierDevelopmentPlanStatus @default(DRAFT)
  ownerUserId           String
  supplierOwnerName     String?
  startsAt              DateTime
  targetCompletionAt    DateTime
  completedAt           DateTime?
  successMeasures       String
  actions               Json
  progressPercent       Int                           @default(0)
  reviewCadence         String?
  tenant                Tenant                        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier              Supplier                      @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt             DateTime                      @default(now())
  updatedAt             DateTime                      @updatedAt

  @@index([tenantId, status, targetCompletionAt])
  @@index([supplierId, status])
}

model SupplierCorrectiveAction {
  id                    String                           @id @default(cuid())
  tenantId              String
  supplierId            String
  scarNumber            String
  title                 String
  description           String
  severity              SupplierCorrectiveActionSeverity
  status                SupplierCorrectiveActionStatus   @default(OPEN)
  sourceType            String?
  sourceId              String?
  ownerUserId           String
  supplierContactName   String?
  supplierContactEmail  String?
  containmentAction     String?
  rootCause             String?
  correctiveActionPlan  String?
  preventiveAction      String?
  dueAt                 DateTime
  supplierRespondedAt   DateTime?
  implementationAt      DateTime?
  verificationNotes     String?
  verifiedByUserId      String?
  verifiedAt            DateTime?
  closedAt              DateTime?
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier              Supplier                         @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@unique([tenantId, scarNumber])
  @@index([tenantId, status, dueAt])
  @@index([supplierId, status])
}
"""

path.write_text(schema)
print("Supplier performance schema applied.")
