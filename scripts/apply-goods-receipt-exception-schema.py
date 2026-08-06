from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum GoodsReceiptSessionStatus {
  DRAFT
  POSTED
  PARTIALLY_ACCEPTED
  FULLY_ACCEPTED
  REJECTED
  CANCELLED
}

enum GoodsReceiptLineCondition {
  ACCEPTED
  DAMAGED
  REJECTED
  QUARANTINED
}

enum GoodsReceiptExceptionType {
  OVER_RECEIPT
  UNDER_RECEIPT
  DAMAGED_GOODS
  REJECTED_GOODS
  WRONG_ITEM
  QUALITY_HOLD
  DELIVERY_DELAY
  OTHER
}

enum GoodsReceiptExceptionStatus {
  OPEN
  INVESTIGATING
  RESOLVED
  WAIVED
  CANCELLED
}

'''

MODELS = '''model GoodsReceiptSession {
  id                   String                    @id @default(cuid())
  tenantId             String
  journeyId            String
  purchaseOrderExecutionId String
  receiptNumber        String
  status               GoodsReceiptSessionStatus @default(DRAFT)
  receivedByUserId     String?
  receivedAt           DateTime                  @default(now())
  deliveryReference    String?
  carrierReference     String?
  locationReference    String?
  notes                String?
  tenant               Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  journey              RequisitionOrderJourney   @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  purchaseOrderExecution PurchaseOrderExecution  @relation(fields: [purchaseOrderExecutionId], references: [id], onDelete: Cascade)
  lines                GoodsReceiptLine[]
  exceptions           GoodsReceiptException[]
  createdAt            DateTime                  @default(now())
  updatedAt            DateTime                  @updatedAt

  @@unique([tenantId, receiptNumber])
  @@index([tenantId, status, receivedAt])
  @@index([journeyId])
  @@index([purchaseOrderExecutionId])
}

model GoodsReceiptLine {
  id                   String                    @id @default(cuid())
  receiptSessionId     String
  lineReference        String
  description          String
  orderedQuantity      Decimal                   @db.Decimal(18, 4)
  previouslyReceived   Decimal                   @default(0) @db.Decimal(18, 4)
  receivedQuantity     Decimal                   @db.Decimal(18, 4)
  acceptedQuantity     Decimal                   @default(0) @db.Decimal(18, 4)
  rejectedQuantity     Decimal                   @default(0) @db.Decimal(18, 4)
  damagedQuantity      Decimal                   @default(0) @db.Decimal(18, 4)
  unitOfMeasure        String                    @default("EA")
  condition            GoodsReceiptLineCondition @default(ACCEPTED)
  serialOrLotReference String?
  notes                String?
  receiptSession       GoodsReceiptSession       @relation(fields: [receiptSessionId], references: [id], onDelete: Cascade)
  createdAt            DateTime                  @default(now())
  updatedAt            DateTime                  @updatedAt

  @@index([receiptSessionId, condition])
}

model GoodsReceiptException {
  id                   String                      @id @default(cuid())
  receiptSessionId     String
  receiptLineId        String?
  exceptionType        GoodsReceiptExceptionType
  status               GoodsReceiptExceptionStatus @default(OPEN)
  severity             RequisitionOrderExceptionSeverity @default(MEDIUM)
  title                String
  description          String?
  ownerUserId          String?
  dueAt                DateTime?
  resolution           String?
  resolvedAt           DateTime?
  receiptSession       GoodsReceiptSession         @relation(fields: [receiptSessionId], references: [id], onDelete: Cascade)
  createdAt            DateTime                    @default(now())
  updatedAt            DateTime                    @updatedAt

  @@index([receiptSessionId, status, severity])
  @@index([status, dueAt])
}
'''

def bounds(text: str, model: str):
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

if "enum GoodsReceiptSessionStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

relations = [
    ("Tenant", "  goodsReceiptSessions GoodsReceiptSession[]"),
    ("RequisitionOrderJourney", "  goodsReceiptSessions GoodsReceiptSession[]"),
    ("PurchaseOrderExecution", "  goodsReceiptSessions GoodsReceiptSession[]"),
]
for model, relation in relations:
    start, end = bounds(schema, model)
    block = schema[start:end]
    field_name = relation.split()[0].strip()
    if f"\n  {field_name}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            anchor = block.find("\n  milestones")
        if anchor < 0:
            raise SystemExit(f"Could not locate {model} relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
        schema = schema[:start] + block + schema[end:]

if "model GoodsReceiptSession {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Goods receipt and exception schema applied.")
