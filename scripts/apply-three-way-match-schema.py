from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ThreeWayMatchStatus {
  DRAFT
  MATCHED
  MATCHED_WITH_WARNINGS
  EXCEPTION
  APPROVED_FOR_PAYMENT
  REJECTED
  CANCELLED
}

enum ThreeWayMatchLineStatus {
  MATCHED
  QUANTITY_VARIANCE
  PRICE_VARIANCE
  AMOUNT_VARIANCE
  RECEIPT_MISSING
  PO_MISSING
  INVOICE_MISSING
}

enum ThreeWayMatchExceptionStatus {
  OPEN
  INVESTIGATING
  RESOLVED
  WAIVED
  REJECTED
}

enum ThreeWayMatchExceptionType {
  QUANTITY_VARIANCE
  PRICE_VARIANCE
  AMOUNT_VARIANCE
  DUPLICATE_INVOICE
  RECEIPT_MISSING
  TAX_VARIANCE
  FREIGHT_VARIANCE
  OTHER
}

"""

MODELS = """
model ThreeWayMatchCase {
  id                       String                  @id @default(cuid())
  tenantId                 String
  purchaseOrderExecutionId String
  goodsReceiptSessionId    String
  supplierInvoiceId        String
  matchNumber              String
  invoiceNumber            String?
  currencyCode             String                  @default("USD")
  status                   ThreeWayMatchStatus     @default(DRAFT)
  poAmount                 Decimal                 @db.Decimal(18, 2)
  receiptAmount            Decimal                 @db.Decimal(18, 2)
  invoiceAmount            Decimal                 @db.Decimal(18, 2)
  amountVariance           Decimal                 @default(0) @db.Decimal(18, 2)
  quantityTolerancePercent Decimal                 @default(0) @db.Decimal(8, 4)
  amountTolerancePercent   Decimal                 @default(0) @db.Decimal(8, 4)
  matchedAt                DateTime?
  approvedForPaymentAt     DateTime?
  approvedByUserId         String?
  createdByUserId          String?
  tenant                   Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  purchaseOrderExecution   PurchaseOrderExecution  @relation(fields: [purchaseOrderExecutionId], references: [id], onDelete: Cascade)
  goodsReceiptSession      GoodsReceiptSession     @relation(fields: [goodsReceiptSessionId], references: [id], onDelete: Cascade)
  lines                    ThreeWayMatchLine[]
  exceptions               ThreeWayMatchException[]
  createdAt                DateTime                @default(now())
  updatedAt                DateTime                @updatedAt

  @@unique([tenantId, matchNumber])
  @@index([tenantId, status, createdAt])
  @@index([purchaseOrderExecutionId])
  @@index([goodsReceiptSessionId])
  @@index([supplierInvoiceId])
}

model ThreeWayMatchLine {
  id                String                  @id @default(cuid())
  matchCaseId       String
  lineReference     String
  description       String
  orderedQuantity   Decimal                 @db.Decimal(18, 4)
  receivedQuantity  Decimal                 @db.Decimal(18, 4)
  invoicedQuantity  Decimal                 @db.Decimal(18, 4)
  poUnitPrice       Decimal                 @db.Decimal(18, 4)
  invoiceUnitPrice  Decimal                 @db.Decimal(18, 4)
  poLineAmount      Decimal                 @db.Decimal(18, 2)
  invoiceLineAmount Decimal                 @db.Decimal(18, 2)
  quantityVariance  Decimal                 @default(0) @db.Decimal(18, 4)
  priceVariance     Decimal                 @default(0) @db.Decimal(18, 4)
  amountVariance    Decimal                 @default(0) @db.Decimal(18, 2)
  status            ThreeWayMatchLineStatus
  evidence          Json?
  matchCase         ThreeWayMatchCase       @relation(fields: [matchCaseId], references: [id], onDelete: Cascade)
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt

  @@index([matchCaseId, status])
}

model ThreeWayMatchException {
  id            String                          @id @default(cuid())
  matchCaseId   String
  matchLineId   String?
  exceptionType ThreeWayMatchExceptionType
  status        ThreeWayMatchExceptionStatus    @default(OPEN)
  severity      RequisitionOrderExceptionSeverity @default(MEDIUM)
  title         String
  description   String?
  ownerUserId   String?
  dueAt         DateTime?
  resolution    String?
  resolvedAt    DateTime?
  matchCase     ThreeWayMatchCase               @relation(fields: [matchCaseId], references: [id], onDelete: Cascade)
  createdAt     DateTime                        @default(now())
  updatedAt     DateTime                        @updatedAt

  @@index([matchCaseId, status, severity])
  @@index([status, dueAt])
}
"""

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

if "enum ThreeWayMatchStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

for model, relation in [
    ("Tenant", "  threeWayMatchCases ThreeWayMatchCase[]"),
    ("PurchaseOrderExecution", "  threeWayMatchCases ThreeWayMatchCase[]"),
    ("GoodsReceiptSession", "  threeWayMatchCases ThreeWayMatchCase[]"),
]:
    start, end = bounds(schema, model)
    block = schema[start:end]
    field_name = relation.split()[0].strip()
    if f"\n  {field_name}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            anchor = block.find("\n  lines")
        if anchor < 0:
            raise SystemExit(f"Could not locate {model} relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
        schema = schema[:start] + block + schema[end:]

if "model ThreeWayMatchCase {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Three-way match schema applied.")
