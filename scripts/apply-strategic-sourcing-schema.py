from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

enum_anchor = "enum SupplierStatus {"
tenant_anchor = "  suppliers             Supplier[]\n"
supplier_anchor = "  documents             SupplierDocument[]\n"

if "enum SourcingEventType" not in schema:
    schema = schema.replace(
        enum_anchor,
        """enum SourcingEventType {
  RFI
  RFQ
  RFP
}

enum SourcingEventStatus {
  DRAFT
  PUBLISHED
  OPEN
  EVALUATION
  AWARDED
  CANCELLED
  CLOSED
}

enum SourcingInvitationStatus {
  INVITED
  VIEWED
  DECLINED
  SUBMITTED
}

enum SourcingResponseStatus {
  DRAFT
  SUBMITTED
  WITHDRAWN
}

enum SourcingCriterionType {
  TECHNICAL
  COMMERCIAL
  RISK
  ESG
  DELIVERY
  OTHER
}

""" + enum_anchor,
        1,
    )

if "  sourcingEvents        SourcingEvent[]" not in schema:
    schema = schema.replace(
        tenant_anchor,
        tenant_anchor + "  sourcingEvents        SourcingEvent[]\n",
        1,
    )

if "  sourcingInvitations   SourcingInvitation[]" not in schema:
    schema = schema.replace(
        supplier_anchor,
        supplier_anchor
        + "  sourcingInvitations   SourcingInvitation[]\n"
        + "  sourcingResponses     SourcingResponse[]\n",
        1,
    )

if "model SourcingEvent {" not in schema:
    schema += r"""

model SourcingEvent {
  id                 String              @id @default(cuid())
  tenantId           String
  eventNumber        String
  type               SourcingEventType
  status             SourcingEventStatus @default(DRAFT)
  title              String
  summary            String
  scopeOfWork        String
  currencyCode       String              @default("USD")
  estimatedValue     Decimal?            @db.Decimal(18, 2)
  responseDeadline   DateTime?
  sealedResponses    Boolean             @default(true)
  allowMultipleRounds Boolean            @default(false)
  currentRound       Int                 @default(1)
  publishedAt        DateTime?
  awardedAt          DateTime?
  awardedSupplierId  String?
  awardRecommendation String?
  awardConfidence    Int?
  tenant             Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  criteria           SourcingCriterion[]
  invitations        SourcingInvitation[]
  responses          SourcingResponse[]
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  @@unique([tenantId, eventNumber])
  @@index([tenantId, status, createdAt])
}

model SourcingCriterion {
  id              String                @id @default(cuid())
  sourcingEventId String
  name            String
  description     String?
  type            SourcingCriterionType
  weight          Int
  sequence        Int
  event           SourcingEvent         @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)
  scores          SourcingScore[]
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  @@unique([sourcingEventId, sequence])
}

model SourcingInvitation {
  id              String                   @id @default(cuid())
  sourcingEventId String
  supplierId      String
  status          SourcingInvitationStatus @default(INVITED)
  invitedAt       DateTime                 @default(now())
  viewedAt        DateTime?
  submittedAt     DateTime?
  event           SourcingEvent            @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)
  supplier        Supplier                 @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@unique([sourcingEventId, supplierId])
}

model SourcingResponse {
  id                String                 @id @default(cuid())
  sourcingEventId   String
  supplierId        String
  round             Int                    @default(1)
  status            SourcingResponseStatus @default(DRAFT)
  currencyCode      String                 @default("USD")
  totalBid          Decimal?               @db.Decimal(18, 2)
  deliveryDays      Int?
  paymentTerms      String?
  technicalResponse String?
  commercialNotes   String?
  submittedAt       DateTime?
  event             SourcingEvent          @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)
  supplier          Supplier               @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  scores            SourcingScore[]
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt

  @@unique([sourcingEventId, supplierId, round])
}

model SourcingScore {
  id            String            @id @default(cuid())
  responseId    String
  criterionId   String
  score         Decimal           @db.Decimal(8, 2)
  weightedScore Decimal           @db.Decimal(10, 4)
  evaluatorId   String?
  rationale     String?
  response      SourcingResponse  @relation(fields: [responseId], references: [id], onDelete: Cascade)
  criterion     SourcingCriterion @relation(fields: [criterionId], references: [id], onDelete: Cascade)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@unique([responseId, criterionId])
}
"""

path.write_text(schema)
print("Strategic sourcing schema applied.")
