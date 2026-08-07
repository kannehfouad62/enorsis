from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum GovernedExecutiveInsightType {
  RISK
  OPPORTUNITY
  PERFORMANCE
  ANOMALY
  GOVERNANCE
  FORECAST
}

enum GovernedExecutiveInsightStatus {
  DRAFT
  PUBLISHED
  ACKNOWLEDGED
  DISMISSED
  ARCHIVED
}

enum GovernedExecutiveInsightRunStatus {
  PENDING
  RUNNING
  COMPLETED
  COMPLETED_WITH_WARNINGS
  FAILED
}

enum GovernedExecutiveInsightFeedbackType {
  USEFUL
  NOT_USEFUL
  INCORRECT
  NEEDS_CONTEXT
}

"""

MODELS = """
model GovernedExecutiveInsightRun {
  id                    String                           @id @default(cuid())
  tenantId              String
  runNumber             String
  status                GovernedExecutiveInsightRunStatus @default(PENDING)
  engineVersion         String
  scope                 String
  startedAt             DateTime?
  completedAt           DateTime?
  initiatedByUserId     String?
  insightCount          Int                              @default(0)
  warningCount          Int                              @default(0)
  failureCount          Int                              @default(0)
  summary               Json?
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  insights              GovernedExecutiveInsight[]
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@unique([tenantId, runNumber])
  @@index([tenantId, status, createdAt])
}

model GovernedExecutiveInsight {
  id                    String                           @id @default(cuid())
  tenantId              String
  insightRunId          String
  insightKey            String
  type                  GovernedExecutiveInsightType
  status                GovernedExecutiveInsightStatus   @default(PUBLISHED)
  severity              RequisitionOrderExceptionSeverity @default(MEDIUM)
  title                 String
  executiveSummary      String
  explanation           String
  recommendation        String?
  confidenceScore       Decimal                          @db.Decimal(5, 2)
  domain                String
  category              String?
  sourceModule          String
  calculationVersion    String
  requiresHumanReview   Boolean                          @default(false)
  acknowledgedByUserId  String?
  acknowledgedAt        DateTime?
  dismissedByUserId     String?
  dismissedAt           DateTime?
  dismissalReason       String?
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  insightRun            GovernedExecutiveInsightRun      @relation(fields: [insightRunId], references: [id], onDelete: Cascade)
  evidence              GovernedExecutiveInsightEvidence[]
  feedback              GovernedExecutiveInsightFeedback[]
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@unique([tenantId, insightRunId, insightKey])
  @@index([tenantId, status, severity, createdAt])
  @@index([domain, type, createdAt])
}

model GovernedExecutiveInsightEvidence {
  id                    String                    @id @default(cuid())
  tenantId              String
  insightId             String
  metricKey             String?
  sourceType            String
  sourceId              String?
  label                 String
  observedValue         String?
  expectedValue         String?
  evidence              Json?
  tenant                Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  insight               GovernedExecutiveInsight  @relation(fields: [insightId], references: [id], onDelete: Cascade)
  createdAt             DateTime                  @default(now())

  @@index([tenantId, createdAt])
  @@index([insightId])
  @@index([metricKey])
}

model GovernedExecutiveInsightFeedback {
  id                    String                             @id @default(cuid())
  tenantId              String
  insightId             String
  userId                String
  feedbackType          GovernedExecutiveInsightFeedbackType
  comment               String?
  tenant                Tenant                             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  insight               GovernedExecutiveInsight           @relation(fields: [insightId], references: [id], onDelete: Cascade)
  createdAt             DateTime                           @default(now())

  @@index([tenantId, createdAt])
  @@index([insightId])
  @@index([userId])
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

if "enum GovernedExecutiveInsightType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  governedExecutiveInsightRuns GovernedExecutiveInsightRun[]",
    "  governedExecutiveInsights GovernedExecutiveInsight[]",
    "  governedExecutiveInsightEvidence GovernedExecutiveInsightEvidence[]",
    "  governedExecutiveInsightFeedback GovernedExecutiveInsightFeedback[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model GovernedExecutiveInsightRun {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Governed executive AI insight schema applied.")
