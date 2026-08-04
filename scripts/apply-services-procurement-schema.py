from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

enums = '''enum StatementOfWorkStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  ACTIVE
  COMPLETED
  TERMINATED
  CANCELLED
}

enum ServiceEngagementType {
  FIXED_FEE
  TIME_AND_MATERIALS
  RETAINER
  MILESTONE_BASED
  CONTINGENT_LABOR
}

enum ServiceMilestoneStatus {
  NOT_STARTED
  IN_PROGRESS
  SUBMITTED
  ACCEPTED
  REJECTED
  PAID
}

enum ServiceWorkerStatus {
  PLANNED
  ACTIVE
  SUSPENDED
  COMPLETED
  TERMINATED
}

enum ServiceTimeEntryStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
  INVOICED
}

'''

if "enum StatementOfWorkStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

def add_relation(model_name: str, relation_line: str, anchor_text: str):
    global schema
    start = schema.find(f"model {model_name} {{")
    if start == -1:
        raise SystemExit(f"Could not locate {model_name} model.")
    end = schema.find("\n}", start)
    if end == -1:
        raise SystemExit(f"Could not locate end of {model_name} model.")
    block = schema[start:end]
    relation_name = relation_line.split()[0].strip()
    if relation_name in block:
        return
    anchor = block.find(anchor_text)
    if anchor == -1:
        raise SystemExit(f"Could not locate insertion anchor in {model_name}.")
    block = block[:anchor] + "\n" + relation_line + block[anchor:]
    schema = schema[:start] + block + schema[end:]

add_relation("Tenant", "  statementsOfWork StatementOfWork[]", "\n  createdAt")
add_relation("Tenant", "  serviceWorkers ServiceWorker[]", "\n  createdAt")
add_relation("Tenant", "  serviceTimeEntries ServiceTimeEntry[]", "\n  createdAt")
add_relation("Supplier", "  statementsOfWork StatementOfWork[]", "\n  @@unique")

if "model StatementOfWork {" not in schema:
    schema += '''
model StatementOfWork {
  id                     String                @id @default(cuid())
  tenantId               String
  supplierId             String
  sowNumber              String
  title                  String
  description            String
  engagementType         ServiceEngagementType
  status                 StatementOfWorkStatus @default(DRAFT)
  currencyCode           String                @default("USD")
  notToExceedAmount      Decimal               @db.Decimal(18, 2)
  committedAmount        Decimal               @default(0) @db.Decimal(18, 2)
  approvedAmount         Decimal               @default(0) @db.Decimal(18, 2)
  startsAt               DateTime
  endsAt                 DateTime
  businessOwnerUserId    String
  procurementOwnerUserId String
  scopeOfWork            String
  deliverables           String
  acceptanceCriteria     String
  approvedByUserId       String?
  approvedAt             DateTime?
  activatedAt            DateTime?
  completedAt            DateTime?
  tenant                 Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier               Supplier              @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  milestones             ServiceMilestone[]
  workers                ServiceWorker[]
  timeEntries            ServiceTimeEntry[]
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt

  @@unique([tenantId, sowNumber])
  @@index([tenantId, status, startsAt])
}

model ServiceMilestone {
  id                String                 @id @default(cuid())
  statementOfWorkId String
  name              String
  description       String?
  status            ServiceMilestoneStatus @default(NOT_STARTED)
  dueAt             DateTime
  amount            Decimal                @db.Decimal(18, 2)
  submittedAt       DateTime?
  acceptedAt        DateTime?
  acceptedByUserId  String?
  acceptanceNotes   String?
  statementOfWork   StatementOfWork        @relation(fields: [statementOfWorkId], references: [id], onDelete: Cascade)
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt

  @@index([statementOfWorkId, status, dueAt])
}

model ServiceWorker {
  id                String              @id @default(cuid())
  tenantId          String
  statementOfWorkId String
  workerReference   String
  fullName          String
  email             String?
  roleTitle         String
  status            ServiceWorkerStatus @default(PLANNED)
  startsAt          DateTime
  endsAt            DateTime?
  hourlyRate        Decimal?            @db.Decimal(18, 4)
  dailyRate         Decimal?            @db.Decimal(18, 4)
  maximumHours      Decimal?            @db.Decimal(18, 2)
  managerUserId     String
  tenant            Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  statementOfWork   StatementOfWork     @relation(fields: [statementOfWorkId], references: [id], onDelete: Cascade)
  timeEntries       ServiceTimeEntry[]
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@unique([statementOfWorkId, workerReference])
  @@index([tenantId, status, startsAt])
}

model ServiceTimeEntry {
  id                String                 @id @default(cuid())
  tenantId          String
  statementOfWorkId String
  serviceWorkerId   String
  workDate          DateTime
  hours             Decimal                @db.Decimal(10, 2)
  rate              Decimal                @db.Decimal(18, 4)
  amount            Decimal                @db.Decimal(18, 2)
  description       String
  status            ServiceTimeEntryStatus @default(DRAFT)
  submittedAt       DateTime?
  approvedAt        DateTime?
  approvedByUserId  String?
  rejectionReason   String?
  tenant            Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  statementOfWork   StatementOfWork        @relation(fields: [statementOfWorkId], references: [id], onDelete: Cascade)
  worker            ServiceWorker          @relation(fields: [serviceWorkerId], references: [id], onDelete: Cascade)
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt

  @@index([tenantId, status, workDate])
}
'''

path.write_text(schema)
print("Services procurement and workforce schema applied.")
