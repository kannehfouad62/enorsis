-- CreateEnum
CREATE TYPE "ApPaymentReadinessStatus" AS ENUM ('DRAFT', 'BLOCKED', 'READY', 'APPROVED', 'BATCHED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApPaymentReadinessCheckStatus" AS ENUM ('PASS', 'WARN', 'FAIL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ApPaymentHoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApPaymentHoldType" AS ENUM ('DUPLICATE_INVOICE', 'MATCH_EXCEPTION', 'TAX_REVIEW', 'BANKING_REVIEW', 'SUPPLIER_COMPLIANCE', 'MANUAL_HOLD', 'OTHER');

-- CreateTable
CREATE TABLE "ApPaymentReadinessCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threeWayMatchCaseId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT NOT NULL,
    "paymentBatchId" TEXT,
    "readinessNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "supplierId" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "invoiceAmount" DECIMAL(18,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "discountDate" TIMESTAMP(3),
    "discountAmount" DECIMAL(18,2),
    "status" "ApPaymentReadinessStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "batchedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApPaymentReadinessCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApPaymentReadinessCheck" (
    "id" TEXT NOT NULL,
    "readinessCaseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ApPaymentReadinessCheckStatus" NOT NULL,
    "releaseBlocking" BOOLEAN NOT NULL DEFAULT false,
    "observedValue" TEXT,
    "expectedValue" TEXT,
    "remediation" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApPaymentReadinessCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApPaymentHold" (
    "id" TEXT NOT NULL,
    "readinessCaseId" TEXT NOT NULL,
    "holdType" "ApPaymentHoldType" NOT NULL,
    "status" "ApPaymentHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "releasedByUserId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApPaymentHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApPaymentReadinessCase_tenantId_status_dueDate_idx" ON "ApPaymentReadinessCase"("tenantId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "ApPaymentReadinessCase_supplierInvoiceId_idx" ON "ApPaymentReadinessCase"("supplierInvoiceId");

-- CreateIndex
CREATE INDEX "ApPaymentReadinessCase_paymentBatchId_idx" ON "ApPaymentReadinessCase"("paymentBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ApPaymentReadinessCase_tenantId_readinessNumber_key" ON "ApPaymentReadinessCase"("tenantId", "readinessNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ApPaymentReadinessCase_threeWayMatchCaseId_key" ON "ApPaymentReadinessCase"("threeWayMatchCaseId");

-- CreateIndex
CREATE INDEX "ApPaymentReadinessCheck_status_releaseBlocking_idx" ON "ApPaymentReadinessCheck"("status", "releaseBlocking");

-- CreateIndex
CREATE UNIQUE INDEX "ApPaymentReadinessCheck_readinessCaseId_key_key" ON "ApPaymentReadinessCheck"("readinessCaseId", "key");

-- CreateIndex
CREATE INDEX "ApPaymentHold_readinessCaseId_status_idx" ON "ApPaymentHold"("readinessCaseId", "status");

-- CreateIndex
CREATE INDEX "ApPaymentHold_holdType_status_idx" ON "ApPaymentHold"("holdType", "status");

-- AddForeignKey
ALTER TABLE "ApPaymentReadinessCase" ADD CONSTRAINT "ApPaymentReadinessCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApPaymentReadinessCase" ADD CONSTRAINT "ApPaymentReadinessCase_threeWayMatchCaseId_fkey" FOREIGN KEY ("threeWayMatchCaseId") REFERENCES "ThreeWayMatchCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApPaymentReadinessCheck" ADD CONSTRAINT "ApPaymentReadinessCheck_readinessCaseId_fkey" FOREIGN KEY ("readinessCaseId") REFERENCES "ApPaymentReadinessCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApPaymentHold" ADD CONSTRAINT "ApPaymentHold_readinessCaseId_fkey" FOREIGN KEY ("readinessCaseId") REFERENCES "ApPaymentReadinessCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
