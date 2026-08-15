ALTER TABLE "SupplierInvoice"
  ADD COLUMN "sourceMarketplaceOrderId" TEXT,
  ADD COLUMN "sourcePurchaseOrderExecutionId" TEXT,
  ADD COLUMN "generatedBySellerTenantId" TEXT,
  ADD COLUMN "pdfBlobPathname" TEXT,
  ADD COLUMN "pdfFileName" TEXT,
  ADD COLUMN "pdfGeneratedAt" TIMESTAMP(3),
  ADD COLUMN "buyerAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "buyerAcknowledgedByUserId" TEXT;

CREATE UNIQUE INDEX "SupplierInvoice_sourceMarketplaceOrderId_key"
  ON "SupplierInvoice"("sourceMarketplaceOrderId");

CREATE INDEX "SupplierInvoice_sourcePurchaseOrderExecutionId_idx"
  ON "SupplierInvoice"("sourcePurchaseOrderExecutionId");
