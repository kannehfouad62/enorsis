from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum RequisitionSubmissionAssessmentStatus {
  DRAFT
  READY
  BLOCKED
  SUBMITTED
  SUPERSEDED
}

enum RequisitionSubmissionCheckStatus {
  PASS
  WARN
  FAIL
  NOT_APPLICABLE
}

'''

MODELS = '''model RequisitionSubmissionAssessment {
  id                    String                                 @id @default(cuid())
  tenantId              String
  journeyId             String
  purchaseRequestId     String
  status                RequisitionSubmissionAssessmentStatus @default(DRAFT)
  requestTitle          String?
  requestNumber         String?
  currencyCode          String                                 @default("USD")
  declaredLineCount     Int                                    @default(0)
  declaredTotalAmount   Decimal?                               @db.Decimal(18, 2)
  businessJustification String?
  budgetReference       String?
  costCenterReference   String?
  requiredByDate        DateTime?
  supplierRequired      Boolean                                @default(false)
  supplierId            String?
  validationSummary     Json?
  assessedByUserId      String?
  assessedAt            DateTime?
  submittedByUserId     String?
  submittedAt           DateTime?
  tenant                 Tenant                                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  journey                RequisitionOrderJourney               @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  checks                 RequisitionSubmissionCheck[]
  createdAt              DateTime                              @default(now())
  updatedAt              DateTime                              @updatedAt

  @@unique([journeyId, purchaseRequestId])
  @@index([tenantId, status, createdAt])
  @@index([purchaseRequestId])
}

model RequisitionSubmissionCheck {
  id              String                          @id @default(cuid())
  assessmentId    String
  key             String
  name            String
  status          RequisitionSubmissionCheckStatus
  releaseBlocking Boolean                         @default(false)
  observedValue   String?
  expectedValue   String?
  remediation     String?
  assessment      RequisitionSubmissionAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  createdAt       DateTime                        @default(now())
  updatedAt       DateTime                        @updatedAt

  @@unique([assessmentId, key])
  @@index([status, releaseBlocking])
}
'''

def bounds(text: str, model: str):
    start = text.find(f"model {model} {{")
    if start < 0:
        raise SystemExit(f"Could not locate {model} model.")
    opening = text.find("{", start)
    depth = 0
    for index in range(opening, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return start, index
    raise SystemExit(f"Could not locate end of {model} model.")

if "enum RequisitionSubmissionAssessmentStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
if "\n  requisitionSubmissionAssessments" not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n  requisitionSubmissionAssessments RequisitionSubmissionAssessment[]" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

start, end = bounds(schema, "RequisitionOrderJourney")
block = schema[start:end]
if "\n  submissionAssessments" not in block:
    anchor = block.find("\n  milestones")
    if anchor < 0:
        raise SystemExit("Could not locate journey relation anchor.")
    block = block[:anchor] + "\n  submissionAssessments RequisitionSubmissionAssessment[]" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model RequisitionSubmissionAssessment {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Purchase request integration schema applied.")
