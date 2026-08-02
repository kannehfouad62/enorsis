from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum ContractStatus" not in schema:
    anchor = "enum SourcingQuestionStatus {"
    schema = schema.replace(
        anchor,
        """enum ContractStatus {
  DRAFT
  IN_REVIEW
  PENDING_APPROVAL
  APPROVED
  ACTIVE
  EXPIRED
  TERMINATED
  CANCELLED
}

enum ContractType {
  MASTER_SERVICE_AGREEMENT
  PURCHASE_AGREEMENT
  FRAMEWORK_AGREEMENT
  STATEMENT_OF_WORK
  NDA
  SOFTWARE_LICENSE
  PROFESSIONAL_SERVICES
  OTHER
}

enum ContractRiskLevel {
  LOW
  MODERATE
  HIGH
  CRITICAL
}

enum ContractApprovalDecision {
  PENDING
  APPROVED
  REJECTED
  RETURNED
}

enum ContractObligationStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  OVERDUE
  WAIVED
}

enum ContractDocumentType {
  DRAFT
  EXECUTED
  AMENDMENT
  EXHIBIT
  SUPPORTING
}

enum ClauseRiskLevel {
  STANDARD
  REVIEW
  HIGH
  PROHIBITED
}

""" + anchor,
        1,
    )

tenant_anchor = "  sourcingEvents        SourcingEvent[]\n"
if "  contracts             Contract[]" not in schema:
    schema = schema.replace(
        tenant_anchor,
        tenant_anchor + "  contracts             Contract[]\n  clauseTemplates        ClauseTemplate[]\n",
        1,
    )

supplier_anchor = "  sourcingResponses     SourcingResponse[]\n"
if "  contracts             Contract[]" not in schema:
    schema = schema.replace(
        supplier_anchor,
        supplier_anchor + "  contracts             Contract[]\n",
        1,
    )

if "model Contract {" not in schema:
    schema += r"""

model Contract {
  id                  String            @id @default(cuid())
  tenantId            String
  supplierId          String
  sourcingEventId     String?
  contractNumber      String
  title               String
  type                ContractType
  status              ContractStatus    @default(DRAFT)
  riskLevel           ContractRiskLevel @default(MODERATE)
  currencyCode        String            @default("USD")
  totalValue          Decimal?          @db.Decimal(18, 2)
  startDate           DateTime?
  endDate             DateTime?
  autoRenew           Boolean           @default(false)
  renewalNoticeDays   Int               @default(90)
  governingLaw        String?
  ownerUserId         String
  summary             String?
  approvedAt          DateTime?
  activatedAt         DateTime?
  terminatedAt        DateTime?
  terminationReason   String?
  tenant              Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier            Supplier          @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  clauses             ContractClause[]
  approvals           ContractApproval[]
  obligations         ContractObligation[]
  documents           ContractDocument[]
  riskReviews         ContractRiskReview[]
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@unique([tenantId, contractNumber])
  @@index([tenantId, status, endDate])
  @@index([supplierId, status])
  @@index([sourcingEventId])
}

model ClauseTemplate {
  id              String          @id @default(cuid())
  tenantId        String
  key             String
  name            String
  category        String
  body            String
  riskLevel       ClauseRiskLevel @default(STANDARD)
  required        Boolean         @default(false)
  version         Int             @default(1)
  isActive        Boolean         @default(true)
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([tenantId, key, version])
  @@index([tenantId, category, isActive])
}

model ContractClause {
  id              String          @id @default(cuid())
  contractId      String
  clauseTemplateId String?
  name            String
  category        String
  body            String
  riskLevel       ClauseRiskLevel @default(STANDARD)
  sequence        Int
  negotiated      Boolean         @default(false)
  contract        Contract        @relation(fields: [contractId], references: [id], onDelete: Cascade)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([contractId, sequence])
  @@index([contractId, riskLevel])
}

model ContractApproval {
  id              String                   @id @default(cuid())
  contractId      String
  approverUserId  String
  sequence        Int
  decision        ContractApprovalDecision @default(PENDING)
  comments        String?
  decidedAt       DateTime?
  contract        Contract                 @relation(fields: [contractId], references: [id], onDelete: Cascade)
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  @@unique([contractId, approverUserId, sequence])
  @@index([approverUserId, decision])
}

model ContractObligation {
  id              String                   @id @default(cuid())
  contractId      String
  title           String
  description     String?
  ownerUserId     String?
  dueDate         DateTime?
  recurring       Boolean                  @default(false)
  recurrenceRule  String?
  status          ContractObligationStatus @default(OPEN)
  completedAt     DateTime?
  contract        Contract                 @relation(fields: [contractId], references: [id], onDelete: Cascade)
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  @@index([contractId, status, dueDate])
  @@index([ownerUserId, status])
}

model ContractDocument {
  id              String               @id @default(cuid())
  contractId      String
  type            ContractDocumentType
  name            String
  blobPathname    String
  storageUrl      String
  contentType     String?
  sizeBytes       Int?
  uploadedByUserId String?
  contract        Contract             @relation(fields: [contractId], references: [id], onDelete: Cascade)
  createdAt       DateTime             @default(now())

  @@index([contractId, type])
}

model ContractRiskReview {
  id              String            @id @default(cuid())
  contractId      String
  reviewerUserId  String
  riskLevel       ContractRiskLevel
  legalRisk       Int
  commercialRisk  Int
  dataPrivacyRisk Int
  complianceRisk  Int
  summary         String
  reviewedAt      DateTime          @default(now())
  contract        Contract          @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@index([contractId, reviewedAt])
}
"""

path.write_text(schema)
print("Contract lifecycle schema applied.")
