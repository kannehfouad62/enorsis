from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

enums = '''enum SupplyRiskEventStatus {
  OPEN
  MONITORING
  CONTAINED
  RECOVERING
  CLOSED
  DISMISSED
}

enum SupplyRiskEventType {
  SUPPLIER_FAILURE
  LOGISTICS_DISRUPTION
  GEOPOLITICAL
  CYBER
  QUALITY
  FINANCIAL
  NATURAL_HAZARD
  REGULATORY
  LABOR
  CAPACITY
  OTHER
}

enum SupplyRiskSeverity {
  LOW
  MODERATE
  HIGH
  CRITICAL
}

enum SupplyExposureType {
  SUPPLIER
  CATEGORY
  COUNTRY
  SITE
  CONTRACT
  PURCHASE_ORDER
}

enum ResiliencePlanStatus {
  DRAFT
  ACTIVE
  TESTED
  ACTIVATED
  COMPLETED
  RETIRED
}

'''

if "enum SupplyRiskEventStatus" not in schema:
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
    "  supplyRiskEvents       SupplyRiskEvent[]",
    "  resiliencePlans        ResiliencePlan[]",
]
missing = [line for line in relations if line.split()[0].strip() not in tenant_block]

if missing:
    anchor = tenant_block.find("\n  createdAt")
    if anchor == -1:
        raise SystemExit("Could not locate Tenant.createdAt insertion anchor.")
    tenant_block = tenant_block[:anchor] + "\n" + "\n".join(missing) + tenant_block[anchor:]
    schema = schema[:tenant_start] + tenant_block + schema[tenant_end:]

if "model SupplyRiskEvent {" not in schema:
    schema += '''
model SupplyRiskEvent {
  id                   String                @id @default(cuid())
  tenantId             String
  eventNumber          String
  title                String
  description          String
  type                 SupplyRiskEventType
  severity             SupplyRiskSeverity
  status               SupplyRiskEventStatus @default(OPEN)
  countryCode          String?
  region               String?
  detectedAt           DateTime
  expectedResolutionAt DateTime?
  resolvedAt           DateTime?
  probabilityPercent   Int                   @default(50)
  financialImpact      Decimal?              @db.Decimal(18, 2)
  operationalImpact    Int                   @default(3)
  overallRiskScore     Decimal               @db.Decimal(10, 2)
  ownerUserId          String
  executiveSummary     String?
  containmentSummary   String?
  recoverySummary      String?
  tenant               Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  exposures            SupplyRiskExposure[]
  resiliencePlans      ResiliencePlan[]
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  @@unique([tenantId, eventNumber])
  @@index([tenantId, status, severity, detectedAt])
}

model SupplyRiskExposure {
  id                   String             @id @default(cuid())
  supplyRiskEventId    String
  type                 SupplyExposureType
  referenceId          String?
  referenceLabel       String
  criticality          Int                @default(3)
  spendAtRisk          Decimal?           @db.Decimal(18, 2)
  daysOfSupply         Int?
  alternateSourceCount Int                @default(0)
  dependencyPercent    Int                @default(0)
  impactSummary        String?
  mitigationSummary    String?
  event                SupplyRiskEvent    @relation(fields: [supplyRiskEventId], references: [id], onDelete: Cascade)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  @@index([supplyRiskEventId, type, criticality])
}

model ResiliencePlan {
  id                    String               @id @default(cuid())
  tenantId              String
  supplyRiskEventId     String?
  name                  String
  description           String
  status                ResiliencePlanStatus @default(DRAFT)
  ownerUserId           String
  activationCriteria    String
  recoveryObjective     String
  recoveryTimeHours     Int?
  minimumServicePercent Int                  @default(50)
  alternateSuppliers    String[]
  alternateSites        String[]
  inventoryStrategy     String?
  logisticsStrategy     String?
  communicationsPlan    String?
  activatedAt           DateTime?
  completedAt           DateTime?
  tenant                Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  event                 SupplyRiskEvent?      @relation(fields: [supplyRiskEventId], references: [id], onDelete: SetNull)
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt

  @@index([tenantId, status, createdAt])
}
'''

path.write_text(schema)
print("Supply risk and resilience schema applied.")
