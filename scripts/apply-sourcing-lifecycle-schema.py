from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum SourcingEvaluatorStatus" not in schema:
    anchor = "enum SourcingAwardStatus {"
    schema = schema.replace(
        anchor,
        """enum SourcingEvaluatorStatus {
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  REMOVED
}

enum SourcingRoundStatus {
  DRAFT
  OPEN
  CLOSED
  CANCELLED
}

""" + anchor,
        1,
    )

event_anchor = "  award              SourcingAward?\n"
if "  evaluators         SourcingEvaluator[]" not in schema:
    schema = schema.replace(
        event_anchor,
        event_anchor
        + "  evaluators         SourcingEvaluator[]\n"
        + "  rounds             SourcingRound[]\n",
        1,
    )

if "model SourcingEvaluator {" not in schema:
    schema += r"""

model SourcingEvaluator {
  id              String                  @id @default(cuid())
  sourcingEventId String
  userId          String
  status          SourcingEvaluatorStatus @default(ASSIGNED)
  assignedByUserId String
  assignedAt      DateTime                @default(now())
  completedAt     DateTime?
  event           SourcingEvent           @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)

  @@unique([sourcingEventId, userId])
  @@index([userId, status])
}

model SourcingRound {
  id              String              @id @default(cuid())
  sourcingEventId String
  roundNumber     Int
  status          SourcingRoundStatus @default(DRAFT)
  title           String
  instructions    String?
  opensAt         DateTime?
  closesAt        DateTime?
  openedAt        DateTime?
  closedAt        DateTime?
  createdByUserId String
  event           SourcingEvent       @relation(fields: [sourcingEventId], references: [id], onDelete: Cascade)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@unique([sourcingEventId, roundNumber])
  @@index([sourcingEventId, status])
}
"""

path.write_text(schema)
print("Sourcing lifecycle schema applied.")
