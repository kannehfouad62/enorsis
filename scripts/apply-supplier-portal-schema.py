from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum SourcingQuestionStatus" not in schema:
    anchor = "enum SourcingEvaluatorStatus {"
    schema = schema.replace(
        anchor,
        """enum SourcingQuestionStatus {
  OPEN
  ANSWERED
  CLOSED
}

enum SourcingAttachmentType {
  RESPONSE
  CLARIFICATION
  EVENT_DOCUMENT
}

enum SealedBidOpeningStatus {
  SCHEDULED
  OPENED
  CANCELLED
}

""" + anchor,
        1,
    )

invitation_anchor = "  submittedAt   DateTime?\n"
if "  accessTokenHash String?" not in schema:
    schema = schema.replace(
        invitation_anchor,
        invitation_anchor
        + "  accessTokenHash String? @unique\n"
        + "  accessExpiresAt DateTime?\n"
        + "  accessRevokedAt DateTime?\n",
        1,
    )

event_anchor = "  rounds             SourcingRound[]\n"
if "  questions          SourcingQuestion[]" not in schema:
    schema = schema.replace(
        event_anchor,
        event_anchor
        + "  questions          SourcingQuestion[]\n"
        + "  attachments        SourcingAttachment[]\n"
        + "  sealedBidOpening   SealedBidOpening?\n",
        1,
    )

response_anchor = "  scores            SourcingScore[]\n"
if "  attachments       SourcingAttachment[]" not in schema:
    schema = schema.replace(
        response_anchor,
        response_anchor + "  attachments       SourcingAttachment[]\n",
        1,
    )

if "model SourcingQuestion {" not in schema:
    schema += r"""

model SourcingQuestion {
  id              String                 @id @default(cuid())
  sourcingEventId String
  supplierId      String
  question        String
  answer          String?
  status          SourcingQuestionStatus @default(OPEN)
  askedAt         DateTime               @default(now())
  answeredAt      DateTime?
  answeredByUserId String?
  event           SourcingEvent          @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)
  supplier        Supplier               @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@index([sourcingEventId, status])
  @@index([supplierId, status])
}

model SourcingAttachment {
  id              String                 @id @default(cuid())
  sourcingEventId String
  responseId      String?
  supplierId      String?
  type            SourcingAttachmentType
  name            String
  blobPathname    String
  storageUrl      String
  contentType     String?
  sizeBytes       Int?
  uploadedByLabel String?
  event           SourcingEvent          @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)
  response        SourcingResponse?       @relation(fields: [responseId], references: [id], onDelete: Cascade)
  createdAt       DateTime                @default(now())

  @@index([sourcingEventId, type])
  @@index([responseId])
}

model SealedBidOpening {
  id              String                 @id @default(cuid())
  sourcingEventId String                 @unique
  status          SealedBidOpeningStatus @default(SCHEDULED)
  scheduledAt     DateTime?
  openedAt        DateTime?
  openedByUserId  String?
  witnessUserIds  String[]
  openingNotes    String?
  responseCount   Int                    @default(0)
  event           SourcingEvent          @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt
}
"""

path.write_text(schema)
print("Supplier portal schema applied.")
