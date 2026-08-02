from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum SourcingAwardStatus" not in schema:
    anchor = "enum SourcingEventType {"
    schema = schema.replace(
        anchor,
        """enum SourcingAwardStatus {
  DRAFT
  RECOMMENDED
  APPROVED
  REJECTED
}

""" + anchor,
        1,
    )

if "model SourcingAward {" not in schema:
    schema += r"""

model SourcingAward {
  id                 String              @id @default(cuid())
  sourcingEventId    String              @unique
  supplierId         String
  responseId         String
  status             SourcingAwardStatus @default(DRAFT)
  recommendation     String
  confidence         Int
  totalWeightedScore Decimal             @db.Decimal(10, 4)
  approvedByUserId   String?
  approvedAt         DateTime?
  rejectedAt         DateTime?
  decisionComments   String?
  event              SourcingEvent       @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  @@index([supplierId])
  @@index([status])
}
"""

event_anchor = "  responses          SourcingResponse[]\n"
if "  award              SourcingAward?" not in schema:
    schema = schema.replace(
        event_anchor,
        event_anchor + "  award              SourcingAward?\n",
        1,
    )

path.write_text(schema)
print("Sourcing evaluation schema applied.")
