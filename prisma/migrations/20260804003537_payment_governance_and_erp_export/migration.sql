-- CreateEnum
CREATE TYPE "PaymentBatchStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'EXPORTED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentBatchItemStatus" AS ENUM ('PENDING', 'INCLUDED', 'REJECTED', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "status" "PaymentBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" TEXT NOT NULL,
    "invoiceCount" INTEGER NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "totalUsdEquivalent" DECIMAL(18,2) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "description" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "exportedByUserId" TEXT,
    "completedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "exportReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentBatchItem" (
    "id" TEXT NOT NULL,
    "paymentBatchId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT NOT NULL,
    "status" "PaymentBatchItemStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "usdEquivalent" DECIMAL(18,2) NOT NULL,
    "paymentReference" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentBatch_tenantId_status_createdAt_idx" ON "PaymentBatch"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentBatch_paymentDate_status_idx" ON "PaymentBatch"("paymentDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentBatch_tenantId_batchNumber_key" ON "PaymentBatch"("tenantId", "batchNumber");

-- CreateIndex
CREATE INDEX "PaymentBatchItem_supplierInvoiceId_idx" ON "PaymentBatchItem"("supplierInvoiceId");

-- CreateIndex
CREATE INDEX "PaymentBatchItem_paymentBatchId_status_idx" ON "PaymentBatchItem"("paymentBatchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentBatchItem_paymentBatchId_supplierInvoiceId_key" ON "PaymentBatchItem"("paymentBatchId", "supplierInvoiceId");

-- AddForeignKey
ALTER TABLE "PaymentBatch" ADD CONSTRAINT "PaymentBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatchItem" ADD CONSTRAINT "PaymentBatchItem_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES "PaymentBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatchItem" ADD CONSTRAINT "PaymentBatchItem_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
