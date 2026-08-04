from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum SupplierRiskAssessmentStatus" not in schema:
    anchor = "enum SupplierStatus {"
    enums = """enum SupplierRiskAssessmentStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  REJECTED
}

enum SupplierRiskFindingStatus {
  OPEN
  MITIGATING
  RESOLVED
  ACCEPTED
}

enum SupplierRiskFindingType {
  FINANCIAL
  OPERATIONAL
  COMPLIANCE
  SANCTIONS
  CYBER
  ESG
  DELIVERY
  QUALITY
  CONCENTRATION
  OTHER
}

enum SupplierEsgRating {
  LEADING
  ACCEPTABLE
  NEEDS_IMPROVEMENT
  HIGH_RISK
  NOT_ASSESSED
}

"""
    if anchor not in schema:
        raise SystemExit("SupplierStatus anchor not found.")
    schema = schema.replace(anchor, enums + anchor, 1)

relation_anchor = "  contracts           Contract[]\n"
if "  riskAssessments      SupplierRiskAssessment[]" not in schema:
    if relation_anchor not in schema:
        raise SystemExit("Supplier relation anchor not found.")
    schema = schema.replace(
        relation_anchor,
        relation_anchor
        + "  riskAssessments      SupplierRiskAssessment[]\n"
        + "  riskFindings         SupplierRiskFinding[]\n"
        + "  esgAssessments       SupplierEsgAssessment[]\n",
        1,
    )

if "model SupplierRiskAssessment {" not in schema:
    schema += """

model SupplierRiskAssessment {
  id                String                       @id @default(cuid())
  tenantId          String
  supplierId        String
  status            SupplierRiskAssessmentStatus @default(IN_REVIEW)
  financialRisk     Int
  operationalRisk   Int
  complianceRisk    Int
  cyberRisk         Int
  esgRisk           Int
  deliveryRisk      Int
  qualityRisk       Int
  concentrationRisk Int
  inherentRiskScore Int
  residualRiskScore Int
  rationale         String
  controls          String?
  reviewedByUserId  String?
  approvedByUserId  String?
  reviewedAt        DateTime?
  approvedAt        DateTime?
  supplier          Supplier                     @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt         DateTime                     @default(now())
  updatedAt         DateTime                     @updatedAt

  @@index([tenantId, status, createdAt])
  @@index([supplierId, createdAt])
}

model SupplierRiskFinding {
  id             String                    @id @default(cuid())
  tenantId       String
  supplierId     String
  type           SupplierRiskFindingType
  status         SupplierRiskFindingStatus @default(OPEN)
  title          String
  description    String
  severity       Int
  dueDate        DateTime?
  ownerUserId    String?
  mitigationPlan String?
  resolvedAt     DateTime?
  supplier       Supplier                  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt      DateTime                  @default(now())
  updatedAt      DateTime                  @updatedAt

  @@index([tenantId, status, severity])
  @@index([supplierId, status])
}

model SupplierEsgAssessment {
  id                  String            @id @default(cuid())
  tenantId            String
  supplierId          String
  environmentalScore  Int
  socialScore         Int
  governanceScore     Int
  overallScore        Int
  rating              SupplierEsgRating @default(NOT_ASSESSED)
  carbonDisclosure    Boolean           @default(false)
  scienceBasedTargets Boolean           @default(false)
  modernSlaveryPolicy Boolean           @default(false)
  diversityProgram    Boolean           @default(false)
  ethicsPolicy        Boolean           @default(false)
  evidenceSummary     String?
  assessedByUserId    String
  assessedAt          DateTime          @default(now())
  supplier            Supplier          @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@index([tenantId, rating, assessedAt])
  @@index([supplierId, assessedAt])
}
"""

path.write_text(schema)
print("Supplier risk and ESG schema applied.")
