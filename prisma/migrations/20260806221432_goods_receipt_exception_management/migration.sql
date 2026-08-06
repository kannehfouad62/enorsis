-- CreateEnum
CREATE TYPE "GoodsReceiptSessionStatus" AS ENUM ('DRAFT', 'POSTED', 'PARTIALLY_ACCEPTED', 'FULLY_ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoodsReceiptLineCondition" AS ENUM ('ACCEPTED', 'DAMAGED', 'REJECTED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "GoodsReceiptExceptionType" AS ENUM ('OVER_RECEIPT', 'UNDER_RECEIPT', 'DAMAGED_GOODS', 'REJECTED_GOODS', 'WRONG_ITEM', 'QUALITY_HOLD', 'DELIVERY_DELAY', 'OTHER');

-- CreateEnum
CREATE TYPE "GoodsReceiptExceptionStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'WAIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GoodsReceiptSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "purchaseOrderExecutionId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "status" "GoodsReceiptSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "receivedByUserId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryReference" TEXT,
    "carrierReference" TEXT,
    "locationReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptSessionId" TEXT NOT NULL,
    "lineReference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderedQuantity" DECIMAL(18,4) NOT NULL,
    "previouslyReceived" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "receivedQuantity" DECIMAL(18,4) NOT NULL,
    "acceptedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rejectedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "damagedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "condition" "GoodsReceiptLineCondition" NOT NULL DEFAULT 'ACCEPTED',
    "serialOrLotReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptException" (
    "id" TEXT NOT NULL,
    "receiptSessionId" TEXT NOT NULL,
    "receiptLineId" TEXT,
    "exceptionType" "GoodsReceiptExceptionType" NOT NULL,
    "status" "GoodsReceiptExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoodsReceiptSession_tenantId_status_receivedAt_idx" ON "GoodsReceiptSession"("tenantId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "GoodsReceiptSession_journeyId_idx" ON "GoodsReceiptSession"("journeyId");

-- CreateIndex
CREATE INDEX "GoodsReceiptSession_purchaseOrderExecutionId_idx" ON "GoodsReceiptSession"("purchaseOrderExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceiptSession_tenantId_receiptNumber_key" ON "GoodsReceiptSession"("tenantId", "receiptNumber");

-- CreateIndex
CREATE INDEX "GoodsReceiptLine_receiptSessionId_condition_idx" ON "GoodsReceiptLine"("receiptSessionId", "condition");

-- CreateIndex
CREATE INDEX "GoodsReceiptException_receiptSessionId_status_severity_idx" ON "GoodsReceiptException"("receiptSessionId", "status", "severity");

-- CreateIndex
CREATE INDEX "GoodsReceiptException_status_dueAt_idx" ON "GoodsReceiptException"("status", "dueAt");

-- AddForeignKey
ALTER TABLE "GoodsReceiptSession" ADD CONSTRAINT "GoodsReceiptSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptSession" ADD CONSTRAINT "GoodsReceiptSession_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "RequisitionOrderJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptSession" ADD CONSTRAINT "GoodsReceiptSession_purchaseOrderExecutionId_fkey" FOREIGN KEY ("purchaseOrderExecutionId") REFERENCES "PurchaseOrderExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_receiptSessionId_fkey" FOREIGN KEY ("receiptSessionId") REFERENCES "GoodsReceiptSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptException" ADD CONSTRAINT "GoodsReceiptException_receiptSessionId_fkey" FOREIGN KEY ("receiptSessionId") REFERENCES "GoodsReceiptSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
