from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ApPaymentReadinessStatus {
  DRAFT
  BLOCKED
  READY
  APPROVED
  BATCHED
  PAID
  CANCELLED
}

enum ApPaymentReadinessCheckStatus {
  PASS
  WARN
  FAIL
  NOT_APPLICABLE
}

enum ApPaymentHoldStatus {
  ACTIVE
  RELEASED
  CANCELLED
}

enum ApPaymentHoldType {
  DUPLICATE_INVOICE
  MATCH_EXCEPTION
  TAX_REVIEW
  BANKING_REVIEW
  SUPPLIER_COMPLIANCE
  MANUAL_HOLD
  OTHER
}

"""

MODELS = """
model ApPaymentReadinessCase {
  id                  String                    @id @default(cuid())
  tenantId            String
  threeWayMatchCaseId String
  supplierInvoiceId   String
  paymentBatchId      String?
  readinessNumber     String
  invoiceNumber       String?
  supplierId          String?
  currencyCode        String                    @default("USD")
  invoiceAmount       Decimal                   @db.Decimal(18, 2)
  dueDate             DateTime?
  discountDate        DateTime?
  discountAmount      Decimal?                  @db.Decimal(18, 2)
  status              ApPaymentReadinessStatus  @default(DRAFT)
  approvedByUserId    String?
  approvedAt          DateTime?
  batchedAt           DateTime?
  paidAt              DateTime?
  createdByUserId     String?
  tenant              Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  threeWayMatchCase   ThreeWayMatchCase          @relation(fields: [threeWayMatchCaseId], references: [id], onDelete: Cascade)
  checks              ApPaymentReadinessCheck[]
  holds               ApPaymentHold[]
  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt

  @@unique([tenantId, readinessNumber])
  @@unique([threeWayMatchCaseId])
  @@index([tenantId, status, dueDate])
  @@index([supplierInvoiceId])
  @@index([paymentBatchId])
}

model ApPaymentReadinessCheck {
  id              String                         @id @default(cuid())
  readinessCaseId String
  key             String
  name            String
  status          ApPaymentReadinessCheckStatus
  releaseBlocking Boolean                        @default(false)
  observedValue   String?
  expectedValue   String?
  remediation     String?
  evidence        Json?
  readinessCase   ApPaymentReadinessCase         @relation(fields: [readinessCaseId], references: [id], onDelete: Cascade)
  createdAt       DateTime                       @default(now())

  @@unique([readinessCaseId, key])
  @@index([status, releaseBlocking])
}

model ApPaymentHold {
  id               String                 @id @default(cuid())
  readinessCaseId  String
  holdType         ApPaymentHoldType
  status           ApPaymentHoldStatus    @default(ACTIVE)
  title            String
  description      String?
  ownerUserId      String?
  releasedByUserId String?
  releasedAt       DateTime?
  releaseReason    String?
  readinessCase    ApPaymentReadinessCase @relation(fields: [readinessCaseId], references: [id], onDelete: Cascade)
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt

  @@index([readinessCaseId, status])
  @@index([holdType, status])
}
"""

def bounds(text, model):
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

if "enum ApPaymentReadinessStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

for model, relation in [
    ("Tenant", "  apPaymentReadinessCases ApPaymentReadinessCase[]"),
    ("ThreeWayMatchCase", "  paymentReadinessCase ApPaymentReadinessCase?"),
]:
    start, end = bounds(schema, model)
    block = schema[start:end]
    field_name = relation.split()[0].strip()
    if f"\n  {field_name}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            anchor = block.find("\n  lines")
        if anchor < 0:
            raise SystemExit(f"Could not locate {model} relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
        schema = schema[:start] + block + schema[end:]

if "model ApPaymentReadinessCase {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("AP payment readiness schema applied.")
