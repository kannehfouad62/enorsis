from pathlib import Path

path = Path('prisma/schema.prisma')
schema = path.read_text()

enums = '''enum PurchaseOrderExecutionStatus {
  DRAFT
  VALIDATION_FAILED
  READY_TO_ISSUE
  ISSUED
  ACKNOWLEDGED
  PARTIALLY_RECEIVED
  FULLY_RECEIVED
  CLOSED
  CANCELLED
}

enum PurchaseOrderRevisionStatus {
  DRAFT
  ISSUED
  SUPERSEDED
}

enum PurchaseOrderValidationStatus {
  PASS
  WARN
  FAIL
}

'''

models = '''model PurchaseOrderExecution {
  id                  String                       @id @default(cuid())
  tenantId            String
  journeyId           String
  purchaseOrderId     String?
  orderNumber         String
  supplierId          String
  contractId          String?
  currencyCode        String                       @default("USD")
  status              PurchaseOrderExecutionStatus @default(DRAFT)
  currentRevision     Int                          @default(1)
  totalAmount         Decimal                      @db.Decimal(18, 2)
  taxAmount           Decimal                      @default(0) @db.Decimal(18, 2)
  freightAmount       Decimal                      @default(0) @db.Decimal(18, 2)
  discountAmount      Decimal                      @default(0) @db.Decimal(18, 2)
  requestedDeliveryAt DateTime?
  issuedAt            DateTime?
  acknowledgedAt      DateTime?
  createdByUserId     String?
  updatedByUserId     String?
  tenant              Tenant                       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  journey             RequisitionOrderJourney      @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  revisions           PurchaseOrderRevision[]
  validations         PurchaseOrderValidation[]
  createdAt           DateTime                     @default(now())
  updatedAt           DateTime                     @updatedAt

  @@unique([tenantId, orderNumber])
  @@index([tenantId, status, createdAt])
  @@index([journeyId])
  @@index([purchaseOrderId])
}

model PurchaseOrderRevision {
  id                  String                      @id @default(cuid())
  executionId         String
  revisionNumber      Int
  status              PurchaseOrderRevisionStatus @default(DRAFT)
  reason              String?
  supplierId          String
  contractId          String?
  currencyCode        String
  subtotalAmount      Decimal                     @db.Decimal(18, 2)
  taxAmount           Decimal                     @default(0) @db.Decimal(18, 2)
  freightAmount       Decimal                     @default(0) @db.Decimal(18, 2)
  discountAmount      Decimal                     @default(0) @db.Decimal(18, 2)
  totalAmount         Decimal                     @db.Decimal(18, 2)
  requestedDeliveryAt DateTime?
  lineSnapshot        Json
  changeSummary       Json?
  createdByUserId     String?
  issuedAt            DateTime?
  execution           PurchaseOrderExecution      @relation(fields: [executionId], references: [id], onDelete: Cascade)
  createdAt           DateTime                    @default(now())
  updatedAt           DateTime                    @updatedAt

  @@unique([executionId, revisionNumber])
  @@index([executionId, status])
}

model PurchaseOrderValidation {
  id              String                        @id @default(cuid())
  executionId     String
  revisionNumber  Int
  key             String
  name            String
  status          PurchaseOrderValidationStatus
  releaseBlocking Boolean                       @default(false)
  observedValue   String?
  expectedValue   String?
  remediation     String?
  execution       PurchaseOrderExecution        @relation(fields: [executionId], references: [id], onDelete: Cascade)
  createdAt       DateTime                      @default(now())

  @@unique([executionId, revisionNumber, key])
  @@index([executionId, revisionNumber, status])
}
'''

def bounds(text: str, model: str):
    start = text.find(f'model {model} {{')
    if start < 0:
        raise SystemExit(f'Could not locate {model} model.')
    opening = text.find('{', start)
    depth = 0
    for index in range(opening, len(text)):
        if text[index] == '{':
            depth += 1
        elif text[index] == '}':
            depth -= 1
            if depth == 0:
                return start, index
    raise SystemExit(f'Could not locate end of {model} model.')

if 'enum PurchaseOrderExecutionStatus' not in schema:
    anchor = 'enum AuditActorType {'
    if anchor not in schema:
        raise SystemExit('Could not locate AuditActorType enum anchor.')
    schema = schema.replace(anchor, enums + anchor, 1)

for model, relation, preferred_anchor in [
    ('Tenant', '  purchaseOrderExecutions PurchaseOrderExecution[]', '\n  createdAt'),
    ('RequisitionOrderJourney', '  purchaseOrderExecutions PurchaseOrderExecution[]', '\n  milestones'),
]:
    start, end = bounds(schema, model)
    block = schema[start:end]
    field_name = relation.split()[0].strip()
    if f'\n  {field_name}' not in block:
        anchor = block.find(preferred_anchor)
        if anchor < 0:
            anchor = block.find('\n  createdAt')
        if anchor < 0:
            raise SystemExit(f'Could not locate {model} relation anchor.')
        block = block[:anchor] + '\n' + relation + block[anchor:]
        schema = schema[:start] + block + schema[end:]

if 'model PurchaseOrderExecution {' not in schema:
    schema += '\n' + models

path.write_text(schema)
print('Purchase order execution schema applied.')
