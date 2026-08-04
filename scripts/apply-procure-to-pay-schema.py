from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum PurchaseOrderStatus" not in schema:
    anchor = "enum PurchaseRequestPriority {"
    enums = """enum PurchaseOrderStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  ISSUED
  PARTIALLY_RECEIVED
  RECEIVED
  CLOSED
  CANCELLED
}

enum ReceiptType {
  GOODS
  SERVICE
}

enum ReceiptStatus {
  DRAFT
  POSTED
  REVERSED
}

enum SupplierInvoiceStatus {
  DRAFT
  SUBMITTED
  MATCHING
  EXCEPTION
  APPROVED
  PAYMENT_READY
  PAID
  REJECTED
  CANCELLED
}

enum InvoiceMatchStatus {
  NOT_MATCHED
  MATCHED
  EXCEPTION
  OVERRIDDEN
}

enum MatchExceptionType {
  QUANTITY
  PRICE
  TAX
  CURRENCY
  MISSING_RECEIPT
  MISSING_PURCHASE_ORDER
  DUPLICATE_INVOICE
  OTHER
}

enum MatchExceptionStatus {
  OPEN
  RESOLVED
  OVERRIDDEN
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate PurchaseRequestPriority enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_anchor = "  purchaseRequests     PurchaseRequest[]\n"
if "  purchaseOrders        PurchaseOrder[]" not in schema:
    if tenant_anchor not in schema:
        raise SystemExit("Could not locate Tenant purchaseRequests relation.")
    schema = schema.replace(
        tenant_anchor,
        tenant_anchor
        + "  purchaseOrders        PurchaseOrder[]\n"
        + "  receipts              ProcurementReceipt[]\n"
        + "  supplierInvoices      SupplierInvoice[]\n",
        1,
    )

supplier_anchor = "  esgAssessments      SupplierEsgAssessment[]\n"
if "  purchaseOrders        PurchaseOrder[]" not in schema:
    if supplier_anchor not in schema:
        raise SystemExit("Could not locate Supplier ESG relation anchor.")
    schema = schema.replace(
        supplier_anchor,
        supplier_anchor
        + "  purchaseOrders        PurchaseOrder[]\n"
        + "  supplierInvoices      SupplierInvoice[]\n",
        1,
    )

request_anchor = "  approvals             PurchaseRequestApproval[]\n"
if "  purchaseOrders        PurchaseOrder[]" not in schema:
    if request_anchor not in schema:
        raise SystemExit("Could not locate PurchaseRequest approvals relation.")
    schema = schema.replace(
        request_anchor,
        request_anchor + "  purchaseOrders        PurchaseOrder[]\n",
        1,
    )

if "model PurchaseOrder {" not in schema:
    schema += r"""

model PurchaseOrder {
  id                    String              @id @default(cuid())
  tenantId              String
  supplierId            String
  purchaseRequestId     String?
  contractId            String?
  purchaseOrderNumber   String
  status                PurchaseOrderStatus @default(DRAFT)
  title                 String
  currencyCode          String              @default("USD")
  subtotal              Decimal             @db.Decimal(18, 2)
  taxAmount             Decimal             @default(0) @db.Decimal(18, 2)
  totalAmount           Decimal             @db.Decimal(18, 2)
  usdEquivalent         Decimal             @db.Decimal(18, 2)
  exchangeRateToUsd     Decimal             @db.Decimal(24, 12)
  exchangeRateSource    String
  exchangeRateDate      DateTime
  paymentTerms          String?
  deliveryAddress       String?
  requestedDeliveryDate DateTime?
  buyerUserId           String
  approvedAt            DateTime?
  issuedAt              DateTime?
  closedAt              DateTime?
  cancelledAt           DateTime?
  cancellationReason    String?
  tenant                Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier              Supplier            @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  purchaseRequest       PurchaseRequest?    @relation(fields: [purchaseRequestId], references: [id], onDelete: SetNull)
  lines                 PurchaseOrderLine[]
  receipts              ProcurementReceipt[]
  invoices              SupplierInvoice[]
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@unique([tenantId, purchaseOrderNumber])
  @@index([tenantId, status, createdAt])
  @@index([supplierId, status])
  @@index([purchaseRequestId])
  @@index([contractId])
}

model PurchaseOrderLine {
  id                    String        @id @default(cuid())
  purchaseOrderId       String
  lineNumber            Int
  description           String
  category              String?
  quantity              Decimal       @db.Decimal(18, 4)
  unitOfMeasure         String
  unitPrice             Decimal       @db.Decimal(18, 4)
  taxAmount             Decimal       @default(0) @db.Decimal(18, 2)
  lineTotal             Decimal       @db.Decimal(18, 2)
  receivedQuantity      Decimal       @default(0) @db.Decimal(18, 4)
  invoicedQuantity      Decimal       @default(0) @db.Decimal(18, 4)
  purchaseOrder         PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  receiptLines          ProcurementReceiptLine[]
  invoiceLines          SupplierInvoiceLine[]
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@unique([purchaseOrderId, lineNumber])
  @@index([purchaseOrderId])
}

model ProcurementReceipt {
  id                    String        @id @default(cuid())
  tenantId              String
  purchaseOrderId       String
  receiptNumber         String
  type                  ReceiptType
  status                ReceiptStatus @default(DRAFT)
  receivedByUserId      String
  receivedAt            DateTime
  deliveryReference     String?
  notes                 String?
  postedAt              DateTime?
  reversedAt            DateTime?
  reversalReason        String?
  tenant                Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  purchaseOrder         PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Restrict)
  lines                 ProcurementReceiptLine[]
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@unique([tenantId, receiptNumber])
  @@index([tenantId, status, receivedAt])
  @@index([purchaseOrderId, status])
}

model ProcurementReceiptLine {
  id                    String             @id @default(cuid())
  receiptId             String
  purchaseOrderLineId   String
  quantityReceived      Decimal            @db.Decimal(18, 4)
  quantityAccepted      Decimal            @db.Decimal(18, 4)
  quantityRejected      Decimal            @default(0) @db.Decimal(18, 4)
  rejectionReason       String?
  receipt               ProcurementReceipt @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  purchaseOrderLine     PurchaseOrderLine   @relation(fields: [purchaseOrderLineId], references: [id], onDelete: Restrict)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@unique([receiptId, purchaseOrderLineId])
  @@index([purchaseOrderLineId])
}

model SupplierInvoice {
  id                    String                @id @default(cuid())
  tenantId              String
  supplierId            String
  purchaseOrderId       String?
  invoiceNumber         String
  status                SupplierInvoiceStatus @default(DRAFT)
  matchStatus           InvoiceMatchStatus    @default(NOT_MATCHED)
  invoiceDate           DateTime
  dueDate               DateTime?
  currencyCode          String                @default("USD")
  subtotal              Decimal               @db.Decimal(18, 2)
  taxAmount             Decimal               @default(0) @db.Decimal(18, 2)
  totalAmount           Decimal               @db.Decimal(18, 2)
  usdEquivalent         Decimal               @db.Decimal(18, 2)
  exchangeRateToUsd     Decimal               @db.Decimal(24, 12)
  exchangeRateSource    String
  exchangeRateDate      DateTime
  paymentReference      String?
  submittedAt           DateTime?
  approvedAt            DateTime?
  paymentReadyAt        DateTime?
  paidAt                DateTime?
  tenant                Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier              Supplier              @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  purchaseOrder         PurchaseOrder?        @relation(fields: [purchaseOrderId], references: [id], onDelete: SetNull)
  lines                 SupplierInvoiceLine[]
  exceptions            InvoiceMatchException[]
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  @@unique([tenantId, supplierId, invoiceNumber])
  @@index([tenantId, status, dueDate])
  @@index([supplierId, status])
  @@index([purchaseOrderId])
}

model SupplierInvoiceLine {
  id                    String            @id @default(cuid())
  supplierInvoiceId     String
  purchaseOrderLineId   String?
  lineNumber            Int
  description           String
  quantity              Decimal           @db.Decimal(18, 4)
  unitPrice             Decimal           @db.Decimal(18, 4)
  taxAmount             Decimal           @default(0) @db.Decimal(18, 2)
  lineTotal             Decimal           @db.Decimal(18, 2)
  supplierInvoice       SupplierInvoice   @relation(fields: [supplierInvoiceId], references: [id], onDelete: Cascade)
  purchaseOrderLine     PurchaseOrderLine? @relation(fields: [purchaseOrderLineId], references: [id], onDelete: SetNull)
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@unique([supplierInvoiceId, lineNumber])
  @@index([purchaseOrderLineId])
}

model InvoiceMatchException {
  id                    String                   @id @default(cuid())
  supplierInvoiceId     String
  type                  MatchExceptionType
  status                MatchExceptionStatus     @default(OPEN)
  severity              Int
  description           String
  expectedValue         Decimal?                 @db.Decimal(18, 4)
  actualValue           Decimal?                 @db.Decimal(18, 4)
  variance              Decimal?                 @db.Decimal(18, 4)
  resolvedByUserId      String?
  resolutionNotes       String?
  resolvedAt            DateTime?
  supplierInvoice       SupplierInvoice          @relation(fields: [supplierInvoiceId], references: [id], onDelete: Cascade)
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  @@index([supplierInvoiceId, status])
  @@index([status, severity])
}
"""

path.write_text(schema)
print("Procure-to-pay schema applied.")
