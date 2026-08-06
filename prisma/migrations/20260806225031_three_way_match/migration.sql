-- CreateEnum
CREATE TYPE "ThreeWayMatchStatus" AS ENUM ('DRAFT', 'MATCHED', 'MATCHED_WITH_WARNINGS', 'EXCEPTION', 'APPROVED_FOR_PAYMENT', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ThreeWayMatchLineStatus" AS ENUM ('MATCHED', 'QUANTITY_VARIANCE', 'PRICE_VARIANCE', 'AMOUNT_VARIANCE', 'RECEIPT_MISSING', 'PO_MISSING', 'INVOICE_MISSING');

-- CreateEnum
CREATE TYPE "ThreeWayMatchExceptionStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'WAIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ThreeWayMatchExceptionType" AS ENUM ('QUANTITY_VARIANCE', 'PRICE_VARIANCE', 'AMOUNT_VARIANCE', 'DUPLICATE_INVOICE', 'RECEIPT_MISSING', 'TAX_VARIANCE', 'FREIGHT_VARIANCE', 'OTHER');

-- CreateTable
CREATE TABLE "ThreeWayMatchCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderExecutionId" TEXT NOT NULL,
    "goodsReceiptSessionId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT NOT NULL,
    "matchNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" "ThreeWayMatchStatus" NOT NULL DEFAULT 'DRAFT',
    "poAmount" DECIMAL(18,2) NOT NULL,
    "receiptAmount" DECIMAL(18,2) NOT NULL,
    "invoiceAmount" DECIMAL(18,2) NOT NULL,
    "amountVariance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantityTolerancePercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "amountTolerancePercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "matchedAt" TIMESTAMP(3),
    "approvedForPaymentAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeWayMatchCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreeWayMatchLine" (
    "id" TEXT NOT NULL,
    "matchCaseId" TEXT NOT NULL,
    "lineReference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderedQuantity" DECIMAL(18,4) NOT NULL,
    "receivedQuantity" DECIMAL(18,4) NOT NULL,
    "invoicedQuantity" DECIMAL(18,4) NOT NULL,
    "poUnitPrice" DECIMAL(18,4) NOT NULL,
    "invoiceUnitPrice" DECIMAL(18,4) NOT NULL,
    "poLineAmount" DECIMAL(18,2) NOT NULL,
    "invoiceLineAmount" DECIMAL(18,2) NOT NULL,
    "quantityVariance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "priceVariance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "amountVariance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "ThreeWayMatchLineStatus" NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeWayMatchLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreeWayMatchException" (
    "id" TEXT NOT NULL,
    "matchCaseId" TEXT NOT NULL,
    "matchLineId" TEXT,
    "exceptionType" "ThreeWayMatchExceptionType" NOT NULL,
    "status" "ThreeWayMatchExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeWayMatchException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThreeWayMatchCase_tenantId_status_createdAt_idx" ON "ThreeWayMatchCase"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ThreeWayMatchCase_purchaseOrderExecutionId_idx" ON "ThreeWayMatchCase"("purchaseOrderExecutionId");

-- CreateIndex
CREATE INDEX "ThreeWayMatchCase_goodsReceiptSessionId_idx" ON "ThreeWayMatchCase"("goodsReceiptSessionId");

-- CreateIndex
CREATE INDEX "ThreeWayMatchCase_supplierInvoiceId_idx" ON "ThreeWayMatchCase"("supplierInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreeWayMatchCase_tenantId_matchNumber_key" ON "ThreeWayMatchCase"("tenantId", "matchNumber");

-- CreateIndex
CREATE INDEX "ThreeWayMatchLine_matchCaseId_status_idx" ON "ThreeWayMatchLine"("matchCaseId", "status");

-- CreateIndex
CREATE INDEX "ThreeWayMatchException_matchCaseId_status_severity_idx" ON "ThreeWayMatchException"("matchCaseId", "status", "severity");

-- CreateIndex
CREATE INDEX "ThreeWayMatchException_status_dueAt_idx" ON "ThreeWayMatchException"("status", "dueAt");

-- AddForeignKey
ALTER TABLE "ThreeWayMatchCase" ADD CONSTRAINT "ThreeWayMatchCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeWayMatchCase" ADD CONSTRAINT "ThreeWayMatchCase_purchaseOrderExecutionId_fkey" FOREIGN KEY ("purchaseOrderExecutionId") REFERENCES "PurchaseOrderExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeWayMatchCase" ADD CONSTRAINT "ThreeWayMatchCase_goodsReceiptSessionId_fkey" FOREIGN KEY ("goodsReceiptSessionId") REFERENCES "GoodsReceiptSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeWayMatchLine" ADD CONSTRAINT "ThreeWayMatchLine_matchCaseId_fkey" FOREIGN KEY ("matchCaseId") REFERENCES "ThreeWayMatchCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeWayMatchException" ADD CONSTRAINT "ThreeWayMatchException_matchCaseId_fkey" FOREIGN KEY ("matchCaseId") REFERENCES "ThreeWayMatchCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
