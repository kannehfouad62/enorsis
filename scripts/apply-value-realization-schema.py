from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ProcurementValueInitiativeStatus {
  IDEA
  QUALIFYING
  APPROVED
  IN_PROGRESS
  REALIZING
  COMPLETED
  CANCELLED
}

enum ProcurementBenefitType {
  COST_REDUCTION
  COST_AVOIDANCE
  WORKING_CAPITAL
  REVENUE_ENABLEMENT
  RISK_REDUCTION
  PRODUCTIVITY
  SUSTAINABILITY
  OTHER
}

enum ProcurementBenefitFrequency {
  ONE_TIME
  MONTHLY
  QUARTERLY
  ANNUAL
}

enum ProcurementBenefitValidationStatus {
  UNVALIDATED
  SUBMITTED
  FINANCE_VALIDATED
  REJECTED
  EXPIRED
}

enum ProcurementValueMilestoneStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  BLOCKED
  CANCELLED
}

"""

MODELS = """
model ProcurementValueInitiative {
  id                    String                           @id @default(cuid())
  tenantId              String
  initiativeNumber      String
  title                 String
  description           String
  status                ProcurementValueInitiativeStatus @default(IDEA)
  category              String?
  supplierId            String?
  sourcingEventId       String?
  contractId            String?
  ownerUserId           String
  financeOwnerUserId    String?
  executiveSponsorUserId String?
  currencyCode          String                           @default("USD")
  baselineAmount        Decimal                          @default(0) @db.Decimal(18, 2)
  targetBenefitAmount   Decimal                          @default(0) @db.Decimal(18, 2)
  forecastBenefitAmount Decimal                          @default(0) @db.Decimal(18, 2)
  realizedBenefitAmount Decimal                          @default(0) @db.Decimal(18, 2)
  leakageAmount         Decimal                          @default(0) @db.Decimal(18, 2)
  probabilityPercent    Int                              @default(50)
  startsAt              DateTime
  targetCompletionAt    DateTime
  completedAt           DateTime?
  assumptions           String?
  risks                 String?
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  benefits              ProcurementBenefit[]
  milestones            ProcurementValueMilestone[]
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@unique([tenantId, initiativeNumber])
  @@index([tenantId, status, targetCompletionAt])
  @@index([supplierId, status])
}

model ProcurementBenefit {
  id                    String                              @id @default(cuid())
  procurementValueInitiativeId String
  type                  ProcurementBenefitType
  name                  String
  description           String?
  frequency             ProcurementBenefitFrequency
  periodStart           DateTime
  periodEnd             DateTime?
  forecastAmount        Decimal                             @default(0) @db.Decimal(18, 2)
  claimedAmount         Decimal                             @default(0) @db.Decimal(18, 2)
  validatedAmount       Decimal                             @default(0) @db.Decimal(18, 2)
  realizedAmount        Decimal                             @default(0) @db.Decimal(18, 2)
  validationStatus      ProcurementBenefitValidationStatus @default(UNVALIDATED)
  methodology           String
  evidenceUrl           String?
  submittedAt           DateTime?
  validatedByUserId     String?
  validatedAt           DateTime?
  rejectionReason       String?
  initiative            ProcurementValueInitiative          @relation(fields: [procurementValueInitiativeId], references: [id], onDelete: Cascade)
  createdAt             DateTime                            @default(now())
  updatedAt             DateTime                            @updatedAt

  @@index([procurementValueInitiativeId, validationStatus, periodStart])
}

model ProcurementValueMilestone {
  id                    String                           @id @default(cuid())
  procurementValueInitiativeId String
  name                  String
  description           String?
  dueAt                 DateTime
  status                ProcurementValueMilestoneStatus @default(NOT_STARTED)
  ownerUserId           String
  completionEvidence    String?
  blocker               String?
  completedAt           DateTime?
  initiative            ProcurementValueInitiative      @relation(fields: [procurementValueInitiativeId], references: [id], onDelete: Cascade)
  createdAt             DateTime                        @default(now())
  updatedAt             DateTime                        @updatedAt

  @@index([procurementValueInitiativeId, status, dueAt])
}
"""

def bounds(text: str, model: str) -> tuple[int, int]:
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

def relation(model: str, line: str) -> None:
    global schema
    start, end = bounds(schema, model)
    block = schema[start:end]
    name = line.split()[0].strip()
    if name in block:
        return
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        anchor = block.find("\n  @@")
    if anchor < 0:
        raise SystemExit(f"Could not locate insertion anchor in {model}.")
    block = block[:anchor] + "\n" + line + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "enum ProcurementValueInitiativeStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

relation("Tenant", "  procurementValueInitiatives ProcurementValueInitiative[]")

if "model ProcurementValueInitiative {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Procurement savings and value realization schema applied.")
