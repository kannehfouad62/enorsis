from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum RequisitionOrderJourneyStatus {
  DRAFT
  REQUISITION_SUBMITTED
  APPROVAL_PENDING
  APPROVED
  ORDER_PENDING
  ORDER_ISSUED
  PARTIALLY_RECEIVED
  RECEIVED
  CLOSED
  CANCELLED
  EXCEPTION
}

enum RequisitionOrderMilestoneType {
  REQUISITION_CREATED
  REQUISITION_SUBMITTED
  APPROVAL_REQUESTED
  APPROVAL_COMPLETED
  ORDER_CREATED
  ORDER_ISSUED
  RECEIPT_RECORDED
  EXCEPTION_RAISED
  EXCEPTION_RESOLVED
  JOURNEY_CLOSED
  JOURNEY_CANCELLED
}

enum RequisitionOrderExceptionStatus {
  OPEN
  INVESTIGATING
  RESOLVED
  WAIVED
  CANCELLED
}

enum RequisitionOrderExceptionSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

"""

MODELS = """
model RequisitionOrderJourney {
  id                 String                         @id @default(cuid())
  tenantId           String
  journeyNumber      String
  title              String
  description        String?
  status             RequisitionOrderJourneyStatus @default(DRAFT)
  requesterUserId    String?
  ownerUserId        String?
  purchaseRequestId  String?
  purchaseOrderId    String?
  primaryReceiptId   String?
  supplierId         String?
  currencyCode       String                         @default("USD")
  estimatedAmount    Decimal?                       @db.Decimal(18, 2)
  committedAmount    Decimal?                       @db.Decimal(18, 2)
  receivedAmount     Decimal?                       @db.Decimal(18, 2)
  requiredByDate     DateTime?
  submittedAt        DateTime?
  approvedAt         DateTime?
  orderedAt          DateTime?
  receivedAt         DateTime?
  closedAt           DateTime?
  cancelledAt        DateTime?
  cancellationReason String?
  correlationId      String?
  tenant             Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  milestones         RequisitionOrderMilestone[]
  exceptions         RequisitionOrderException[]
  createdAt          DateTime                       @default(now())
  updatedAt          DateTime                       @updatedAt

  @@unique([tenantId, journeyNumber])
  @@index([tenantId, status, createdAt])
  @@index([purchaseRequestId])
  @@index([purchaseOrderId])
  @@index([supplierId])
}

model RequisitionOrderMilestone {
  id             String                        @id @default(cuid())
  journeyId      String
  milestoneType  RequisitionOrderMilestoneType
  title          String
  description    String?
  actorUserId    String?
  sourceModule   String?
  sourceRecordId String?
  metadata       Json?
  occurredAt     DateTime                      @default(now())
  journey        RequisitionOrderJourney       @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  createdAt      DateTime                      @default(now())

  @@index([journeyId, occurredAt])
  @@index([milestoneType, occurredAt])
}

model RequisitionOrderException {
  id             String                             @id @default(cuid())
  journeyId      String
  code           String
  title          String
  description    String?
  severity       RequisitionOrderExceptionSeverity @default(MEDIUM)
  status         RequisitionOrderExceptionStatus   @default(OPEN)
  ownerUserId    String?
  dueAt          DateTime?
  resolvedAt     DateTime?
  resolution     String?
  sourceModule   String?
  sourceRecordId String?
  journey        RequisitionOrderJourney            @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  createdAt      DateTime                           @default(now())
  updatedAt      DateTime                           @updatedAt

  @@index([journeyId, status, severity])
  @@index([status, dueAt])
}
"""

def model_bounds(text: str, name: str):
    start = text.find(f"model {name} {{")
    if start == -1:
        raise SystemExit(f"Could not locate {name} model.")
    opening = text.find("{", start)
    depth = 0
    for i in range(opening, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return start, i
    raise SystemExit(f"Could not locate end of {name} model.")

if "enum RequisitionOrderJourneyStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = model_bounds(schema, "Tenant")
block = schema[start:end]
if "\n  requisitionOrderJourneys" not in block:
    anchor = block.find("\n  createdAt")
    if anchor == -1:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n  requisitionOrderJourneys RequisitionOrderJourney[]" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model RequisitionOrderJourney {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Requisition-to-order orchestration schema applied.")
