from pathlib import Path

path = Path('prisma/schema.prisma')
schema = path.read_text()

enums = '''enum RequisitionApprovalRouteStatus {
  DRAFT
  ACTIVE
  APPROVED
  REJECTED
  CANCELLED
  EXPIRED
}

enum RequisitionApprovalStepMode {
  SEQUENTIAL
  PARALLEL
}

enum RequisitionApprovalDecisionStatus {
  PENDING
  APPROVED
  REJECTED
  DELEGATED
  SKIPPED
  EXPIRED
}

'''

models = '''model RequisitionApprovalRoute {
  id                 String                         @id @default(cuid())
  tenantId           String
  journeyId          String
  assessmentId       String?
  name               String
  status             RequisitionApprovalRouteStatus @default(DRAFT)
  currentSequence    Int                            @default(1)
  amount             Decimal?                       @db.Decimal(18, 2)
  currencyCode       String                         @default("USD")
  initiatedByUserId  String?
  initiatedAt        DateTime?
  completedAt        DateTime?
  rejectedAt         DateTime?
  rejectionReason    String?
  correlationId      String?
  tenant             Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  journey            RequisitionOrderJourney        @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  steps              RequisitionApprovalStep[]
  createdAt          DateTime                       @default(now())
  updatedAt          DateTime                       @updatedAt

  @@index([tenantId, status, createdAt])
  @@index([journeyId, status])
}

model RequisitionApprovalStep {
  id                 String                       @id @default(cuid())
  routeId            String
  sequence           Int
  name               String
  mode               RequisitionApprovalStepMode @default(SEQUENTIAL)
  requiredApprovals  Int                         @default(1)
  approvalRole       String?
  approvalUserId     String?
  amountThreshold    Decimal?                    @db.Decimal(18, 2)
  dueAt              DateTime?
  completedAt        DateTime?
  route              RequisitionApprovalRoute    @relation(fields: [routeId], references: [id], onDelete: Cascade)
  decisions          RequisitionApprovalDecision[]
  createdAt          DateTime                    @default(now())
  updatedAt          DateTime                    @updatedAt

  @@unique([routeId, sequence, name])
  @@index([routeId, sequence])
}

model RequisitionApprovalDecision {
  id                 String                            @id @default(cuid())
  stepId             String
  approverUserId     String
  delegatedFromUserId String?
  status             RequisitionApprovalDecisionStatus @default(PENDING)
  comments           String?
  decidedAt          DateTime?
  dueAt              DateTime?
  step               RequisitionApprovalStep           @relation(fields: [stepId], references: [id], onDelete: Cascade)
  createdAt          DateTime                          @default(now())
  updatedAt          DateTime                          @updatedAt

  @@unique([stepId, approverUserId])
  @@index([approverUserId, status, dueAt])
}
'''

def bounds(text, model):
    start = text.find(f'model {model} {{')
    if start < 0:
        raise SystemExit(f'Could not locate {model} model.')
    opening = text.find('{', start)
    depth = 0
    for i in range(opening, len(text)):
        if text[i] == '{': depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0: return start, i
    raise SystemExit(f'Could not locate end of {model} model.')

if 'enum RequisitionApprovalRouteStatus' not in schema:
    anchor = 'enum AuditActorType {'
    if anchor not in schema:
        raise SystemExit('Could not locate AuditActorType enum anchor.')
    schema = schema.replace(anchor, enums + anchor, 1)

for model, relation in [
    ('Tenant', '  requisitionApprovalRoutes RequisitionApprovalRoute[]'),
    ('RequisitionOrderJourney', '  approvalRoutes RequisitionApprovalRoute[]'),
]:
    start, end = bounds(schema, model)
    block = schema[start:end]
    field = relation.split()[0].strip()
    if f'\n  {field}' not in block:
        anchor = block.find('\n  createdAt')
        if anchor < 0:
            anchor = block.find('\n  milestones')
        if anchor < 0:
            raise SystemExit(f'Could not locate insertion anchor for {model}.')
        block = block[:anchor] + '\n' + relation + block[anchor:]
        schema = schema[:start] + block + schema[end:]

if 'model RequisitionApprovalRoute {' not in schema:
    schema += '\n' + models

path.write_text(schema)
print('Approval orchestration schema applied.')
