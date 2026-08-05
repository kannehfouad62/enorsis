from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum SupplierEsgStatus {
  NOT_ASSESSED
  ASSESSMENT_DUE
  ASSESSED
  IMPROVEMENT_REQUIRED
  SUSPENDED
}

enum SupplierEsgRiskLevel {
  LOW
  MODERATE
  HIGH
  CRITICAL
}

enum ResponsibleSourcingAssessmentStatus {
  DRAFT
  IN_PROGRESS
  SUBMITTED
  APPROVED
  REJECTED
  EXPIRED
}

enum SustainabilityImprovementStatus {
  OPEN
  IN_PROGRESS
  BLOCKED
  COMPLETED
  CANCELLED
}

enum DiversityClassification {
  NONE
  MINORITY_OWNED
  WOMEN_OWNED
  VETERAN_OWNED
  DISABILITY_OWNED
  LGBTQ_OWNED
  SMALL_BUSINESS
  LOCAL_BUSINESS
  SOCIAL_ENTERPRISE
  OTHER
}

"""

MODELS = """
model SupplierEsgProfile {
  id                         String               @id @default(cuid())
  tenantId                   String
  supplierId                 String               @unique
  status                     SupplierEsgStatus    @default(NOT_ASSESSED)
  riskLevel                  SupplierEsgRiskLevel @default(MODERATE)
  environmentalScore         Decimal?             @db.Decimal(5, 2)
  socialScore                Decimal?             @db.Decimal(5, 2)
  governanceScore            Decimal?             @db.Decimal(5, 2)
  overallScore               Decimal?             @db.Decimal(5, 2)
  scope1Emissions            Decimal?             @db.Decimal(18, 4)
  scope2Emissions            Decimal?             @db.Decimal(18, 4)
  scope3Emissions            Decimal?             @db.Decimal(18, 4)
  emissionsUnit              String?              @default("tCO2e")
  renewableEnergyPercent     Decimal?             @db.Decimal(5, 2)
  wasteDiversionPercent      Decimal?             @db.Decimal(5, 2)
  waterUse                   Decimal?             @db.Decimal(18, 4)
  humanRightsPolicy          Boolean              @default(false)
  modernSlaveryStatement     Boolean              @default(false)
  conflictMineralsDeclaration Boolean             @default(false)
  codeOfConductAccepted      Boolean              @default(false)
  diversityClassification   DiversityClassification @default(NONE)
  diversityCertificationId  String?
  certificationExpiresAt     DateTime?
  lastAssessedAt             DateTime?
  nextAssessmentDueAt        DateTime?
  ownerUserId                String
  tenant                     Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier                   Supplier             @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  assessments                ResponsibleSourcingAssessment[]
  improvementPlans           SustainabilityImprovementPlan[]
  createdAt                  DateTime             @default(now())
  updatedAt                  DateTime             @updatedAt

  @@index([tenantId, status, riskLevel])
  @@index([diversityClassification])
}

model ResponsibleSourcingAssessment {
  id                    String                               @id @default(cuid())
  supplierEsgProfileId  String
  assessmentPeriod      String
  status                ResponsibleSourcingAssessmentStatus @default(DRAFT)
  environmentalScore    Decimal?                            @db.Decimal(5, 2)
  socialScore           Decimal?                            @db.Decimal(5, 2)
  governanceScore       Decimal?                            @db.Decimal(5, 2)
  findings              String?
  evidence              Json?
  assessedByUserId      String
  submittedAt           DateTime?
  approvedByUserId      String?
  approvedAt            DateTime?
  expiresAt             DateTime?
  profile               SupplierEsgProfile                  @relation(fields: [supplierEsgProfileId], references: [id], onDelete: Cascade)
  createdAt             DateTime                            @default(now())
  updatedAt             DateTime                            @updatedAt

  @@unique([supplierEsgProfileId, assessmentPeriod])
  @@index([status, expiresAt])
}

model SustainabilityImprovementPlan {
  id                    String                         @id @default(cuid())
  supplierEsgProfileId  String
  title                 String
  description           String
  status                SustainabilityImprovementStatus @default(OPEN)
  category              String
  targetMetric          String?
  baselineValue         Decimal?                      @db.Decimal(18, 4)
  targetValue           Decimal?                      @db.Decimal(18, 4)
  dueAt                 DateTime
  ownerUserId           String
  supplierOwnerName     String?
  blocker               String?
  completionEvidence    String?
  completedAt           DateTime?
  profile               SupplierEsgProfile             @relation(fields: [supplierEsgProfileId], references: [id], onDelete: Cascade)
  createdAt             DateTime                       @default(now())
  updatedAt             DateTime                       @updatedAt

  @@index([supplierEsgProfileId, status, dueAt])
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

if "enum SupplierEsgStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

relation("Tenant", "  supplierEsgProfiles SupplierEsgProfile[]")
relation("Supplier", "  esgProfile SupplierEsgProfile?")

if "model SupplierEsgProfile {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Sustainable procurement and responsible sourcing schema applied.")
