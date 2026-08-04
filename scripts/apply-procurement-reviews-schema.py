from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum ProcurementReviewStatus" not in schema:
    anchor = "enum AuditActorType {"

    enums = """enum ProcurementReviewStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  PUBLISHED
  CANCELLED
}

enum ProcurementReviewType {
  WEEKLY_OPERATING_REVIEW
  MONTHLY_BUSINESS_REVIEW
  QUARTERLY_BUSINESS_REVIEW
  EXECUTIVE_COMMITTEE
  BOARD_PACK
}

enum ProcurementReviewActionStatus {
  OPEN
  IN_PROGRESS
  BLOCKED
  COMPLETED
  CANCELLED
}

enum ProcurementReviewMetricStatus {
  ON_TRACK
  AT_RISK
  OFF_TRACK
  NOT_AVAILABLE
}

"""

    if anchor not in schema:
        raise SystemExit(
            "Could not locate the AuditActorType enum anchor."
        )

    schema = schema.replace(anchor, enums + anchor, 1)

tenant_start = schema.find("model Tenant {")
if tenant_start == -1:
    raise SystemExit("Could not locate the Tenant model.")

tenant_end = schema.find("\n}", tenant_start)
if tenant_end == -1:
    raise SystemExit("Could not locate the end of the Tenant model.")

tenant_block = schema[tenant_start:tenant_end]

if "procurementReviews" not in tenant_block:
    created_at_position = tenant_block.find("\n  createdAt")

    if created_at_position == -1:
        raise SystemExit(
            "Could not locate Tenant.createdAt as the insertion anchor."
        )

    tenant_block = (
        tenant_block[:created_at_position]
        + "\n  procurementReviews         ProcurementReview[]"
        + tenant_block[created_at_position:]
    )

    schema = (
        schema[:tenant_start]
        + tenant_block
        + schema[tenant_end:]
    )

if "model ProcurementReview {" not in schema:
    schema += """

model ProcurementReview {
  id                   String                    @id @default(cuid())
  tenantId             String
  title                String
  type                 ProcurementReviewType
  status               ProcurementReviewStatus  @default(DRAFT)
  periodStart          DateTime
  periodEnd            DateTime
  meetingAt            DateTime
  preparedByUserId     String
  chairUserId          String?
  executiveSummary     String?
  accomplishments      String?
  decisionsRequired    String?
  keyRisks             String?
  nextPeriodPriorities String?
  approvedByUserId     String?
  approvedAt           DateTime?
  publishedAt          DateTime?
  tenant               Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  metrics              ProcurementReviewMetric[]
  actions              ProcurementReviewAction[]
  createdAt            DateTime                  @default(now())
  updatedAt            DateTime                  @updatedAt

  @@index([tenantId, status, meetingAt])
  @@index([tenantId, type, periodEnd])
}

model ProcurementReviewMetric {
  id                  String                         @id @default(cuid())
  procurementReviewId String
  key                 String
  name                String
  category            String
  value               Decimal?                       @db.Decimal(18, 4)
  target              Decimal?                       @db.Decimal(18, 4)
  unit                String?
  status              ProcurementReviewMetricStatus  @default(NOT_AVAILABLE)
  commentary          String?
  sourceType          String?
  sourceId            String?
  evidence            Json?
  review              ProcurementReview              @relation(fields: [procurementReviewId], references: [id], onDelete: Cascade)
  createdAt           DateTime                       @default(now())
  updatedAt           DateTime                       @updatedAt

  @@unique([procurementReviewId, key])
  @@index([procurementReviewId, category, status])
}

model ProcurementReviewAction {
  id                  String                         @id @default(cuid())
  procurementReviewId String
  title               String
  description         String?
  ownerUserId         String
  dueAt               DateTime
  status              ProcurementReviewActionStatus  @default(OPEN)
  blocker             String?
  completionEvidence  String?
  completedAt         DateTime?
  review              ProcurementReview              @relation(fields: [procurementReviewId], references: [id], onDelete: Cascade)
  createdAt           DateTime                       @default(now())
  updatedAt           DateTime                       @updatedAt

  @@index([procurementReviewId, status, dueAt])
  @@index([ownerUserId, status, dueAt])
}
"""

path.write_text(schema)

print("Procurement executive review schema applied.")
