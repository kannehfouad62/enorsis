from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum PaymentBatchStatus" not in schema:
    anchor = "enum MatchExceptionStatus {"
    enums = """enum PaymentBatchStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  EXPORTED
  PROCESSING
  COMPLETED
  CANCELLED
}

enum PaymentBatchItemStatus {
  PENDING
  INCLUDED
  REJECTED
  PAID
  FAILED
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate MatchExceptionStatus enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_pattern = re.compile(r"(model Tenant \{.*?)(\n\s+createdAt\s+DateTime)", re.DOTALL)
tenant_match = tenant_pattern.search(schema)
if not tenant_match:
    raise SystemExit("Could not locate the Tenant model.")
tenant_block = tenant_match.group(1)
if "paymentBatches" not in tenant_block:
    tenant_block += "\n  paymentBatches        PaymentBatch[]"
    schema = schema[:tenant_match.start(1)] + tenant_block + schema[tenant_match.end(1):]

invoice_pattern = re.compile(r"(model SupplierInvoice \{.*?)(\n\s+createdAt\s+DateTime)", re.DOTALL)
invoice_match = invoice_pattern.search(schema)
if not invoice_match:
    raise SystemExit("Could not locate the SupplierInvoice model.")
invoice_block = invoice_match.group(1)
if "paymentBatchItems" not in invoice_block:
    invoice_block += "\n  paymentBatchItems     PaymentBatchItem[]"
    schema = schema[:invoice_match.start(1)] + invoice_block + schema[invoice_match.end(1):]

if "model PaymentBatch {" not in schema:
    schema += r"""

model PaymentBatch {
  id                    String             @id @default(cuid())
  tenantId              String
  batchNumber           String
  status                PaymentBatchStatus @default(DRAFT)
  currencyCode          String
  invoiceCount          Int
  totalAmount           Decimal            @db.Decimal(18, 2)
  totalUsdEquivalent    Decimal            @db.Decimal(18, 2)
  paymentDate           DateTime?
  description           String?
  createdByUserId       String
  submittedByUserId     String?
  approvedByUserId      String?
  exportedByUserId      String?
  completedByUserId     String?
  submittedAt           DateTime?
  approvedAt            DateTime?
  exportedAt            DateTime?
  completedAt           DateTime?
  cancelledAt           DateTime?
  cancellationReason    String?
  exportReference       String?
  tenant                Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  items                 PaymentBatchItem[]
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@unique([tenantId, batchNumber])
  @@index([tenantId, status, createdAt])
  @@index([paymentDate, status])
}

model PaymentBatchItem {
  id                    String                 @id @default(cuid())
  paymentBatchId        String
  supplierInvoiceId     String
  status                PaymentBatchItemStatus @default(PENDING)
  amount                Decimal                @db.Decimal(18, 2)
  usdEquivalent         Decimal                @db.Decimal(18, 2)
  paymentReference      String?
  failureReason         String?
  paidAt                DateTime?
  paymentBatch          PaymentBatch           @relation(fields: [paymentBatchId], references: [id], onDelete: Cascade)
  supplierInvoice       SupplierInvoice        @relation(fields: [supplierInvoiceId], references: [id], onDelete: Restrict)
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@unique([paymentBatchId, supplierInvoiceId])
  @@index([supplierInvoiceId])
  @@index([paymentBatchId, status])
}
"""

path.write_text(schema)
print("Payment governance schema applied.")
