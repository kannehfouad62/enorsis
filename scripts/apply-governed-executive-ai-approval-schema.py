from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum GovernedExecutiveApprovalStatus {
  PENDING_REVIEW
  IN_REVIEW
  APPROVED
  REJECTED
  CHANGES_REQUESTED
  ESCALATED
  CANCELLED
}

enum GovernedExecutiveApprovalDecision {
  APPROVE
  REJECT
  REQUEST_CHANGES
  ESCALATE
}

"""

MODELS = """
model GovernedExecutiveInsightApproval {
  id                    String                           @id @default(cuid())
  tenantId              String
  insightId             String
  status                GovernedExecutiveApprovalStatus @default(PENDING_REVIEW)
  assignedReviewerUserId String?
  assignedAt            DateTime?
  dueAt                 DateTime?
  escalatedAt           DateTime?
  escalationReason      String?
  currentDecisionId     String?
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  insight               GovernedExecutiveInsight         @relation(fields: [insightId], references: [id], onDelete: Cascade)
  decisions             GovernedExecutiveInsightApprovalDecision[]
  auditEvents           GovernedExecutiveInsightApprovalAuditEvent[]
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@unique([tenantId, insightId])
  @@index([tenantId, status, dueAt])
  @@index([assignedReviewerUserId, status])
}

model GovernedExecutiveInsightApprovalDecision {
  id                    String                              @id @default(cuid())
  tenantId              String
  approvalId            String
  decision              GovernedExecutiveApprovalDecision
  decidedByUserId       String
  comment               String?
  decidedAt             DateTime                            @default(now())
  tenant                Tenant                              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  approval              GovernedExecutiveInsightApproval    @relation(fields: [approvalId], references: [id], onDelete: Cascade)
  createdAt             DateTime                            @default(now())

  @@index([tenantId, decidedAt])
  @@index([approvalId, decidedAt])
  @@index([decidedByUserId])
}

model GovernedExecutiveInsightApprovalAuditEvent {
  id                    String                           @id @default(cuid())
  tenantId              String
  approvalId            String
  eventType             String
  actorUserId           String?
  description           String
  metadata              Json?
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  approval              GovernedExecutiveInsightApproval @relation(fields: [approvalId], references: [id], onDelete: Cascade)
  createdAt             DateTime                         @default(now())

  @@index([tenantId, createdAt])
  @@index([approvalId, createdAt])
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

if "enum GovernedExecutiveApprovalStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  governedExecutiveInsightApprovals GovernedExecutiveInsightApproval[]",
    "  governedExecutiveInsightApprovalDecisions GovernedExecutiveInsightApprovalDecision[]",
    "  governedExecutiveInsightApprovalAuditEvents GovernedExecutiveInsightApprovalAuditEvent[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

start, end = bounds(schema, "GovernedExecutiveInsight")
block = schema[start:end]

if "\n  approval " not in block and "\n  approval\t" not in block:
    anchor = block.find("\n  evidence")
    if anchor < 0:
        raise SystemExit("Could not locate GovernedExecutiveInsight relation anchor.")
    block = (
        block[:anchor]
        + "\n  approval              GovernedExecutiveInsightApproval?\n"
        + block[anchor:]
    )

schema = schema[:start] + block + schema[end:]

if "model GovernedExecutiveInsightApproval {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Governed executive AI approval schema applied.")
