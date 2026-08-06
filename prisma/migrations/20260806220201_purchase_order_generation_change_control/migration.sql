-- CreateEnum
CREATE TYPE "PurchaseOrderExecutionStatus" AS ENUM ('DRAFT', 'VALIDATION_FAILED', 'READY_TO_ISSUE', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderRevisionStatus" AS ENUM ('DRAFT', 'ISSUED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PurchaseOrderValidationStatus" AS ENUM ('PASS', 'WARN', 'FAIL');

-- CreateTable
CREATE TABLE "PurchaseOrderExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "contractId" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" "PurchaseOrderExecutionStatus" NOT NULL DEFAULT 'DRAFT',
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "freightAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "requestedDeliveryAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderRevision" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "status" "PurchaseOrderRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "supplierId" TEXT NOT NULL,
    "contractId" TEXT,
    "currencyCode" TEXT NOT NULL,
    "subtotalAmount" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "freightAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "requestedDeliveryAt" TIMESTAMP(3),
    "lineSnapshot" JSONB NOT NULL,
    "changeSummary" JSONB,
    "createdByUserId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderValidation" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PurchaseOrderValidationStatus" NOT NULL,
    "releaseBlocking" BOOLEAN NOT NULL DEFAULT false,
    "observedValue" TEXT,
    "expectedValue" TEXT,
    "remediation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderExecution_tenantId_status_createdAt_idx" ON "PurchaseOrderExecution"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderExecution_journeyId_idx" ON "PurchaseOrderExecution"("journeyId");

-- CreateIndex
CREATE INDEX "PurchaseOrderExecution_purchaseOrderId_idx" ON "PurchaseOrderExecution"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderExecution_tenantId_orderNumber_key" ON "PurchaseOrderExecution"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderRevision_executionId_status_idx" ON "PurchaseOrderRevision"("executionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderRevision_executionId_revisionNumber_key" ON "PurchaseOrderRevision"("executionId", "revisionNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderValidation_executionId_revisionNumber_status_idx" ON "PurchaseOrderValidation"("executionId", "revisionNumber", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderValidation_executionId_revisionNumber_key_key" ON "PurchaseOrderValidation"("executionId", "revisionNumber", "key");

-- AddForeignKey
ALTER TABLE "PurchaseOrderExecution" ADD CONSTRAINT "PurchaseOrderExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderExecution" ADD CONSTRAINT "PurchaseOrderExecution_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "RequisitionOrderJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderRevision" ADD CONSTRAINT "PurchaseOrderRevision_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "PurchaseOrderExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderValidation" ADD CONSTRAINT "PurchaseOrderValidation_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "PurchaseOrderExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
