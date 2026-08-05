-- CreateEnum
CREATE TYPE "SupplierClaimType" AS ENUM ('DAMAGED_GOODS', 'SHORT_SHIPMENT', 'OVER_SHIPMENT', 'WRONG_ITEM', 'QUALITY_DEFECT', 'WARRANTY', 'LATE_DELIVERY', 'PRICING_ERROR', 'FREIGHT_DAMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'SETTLED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnDisposition" AS ENUM ('RETURN_TO_SUPPLIER', 'REPLACE', 'REPAIR', 'SCRAP', 'USE_AS_IS', 'CREDIT_ONLY');

-- CreateEnum
CREATE TYPE "SupplierRecoveryType" AS ENUM ('CREDIT_NOTE', 'DEBIT_MEMO', 'CASH_REFUND', 'REPLACEMENT', 'SERVICE_CREDIT', 'PRICE_ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierRecoveryStatus" AS ENUM ('PROPOSED', 'AGREED', 'ISSUED', 'RECEIVED', 'APPLIED', 'DISPUTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SupplierClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "type" "SupplierClaimType" NOT NULL,
    "status" "SupplierClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "receiptId" TEXT,
    "shipmentId" TEXT,
    "invoiceId" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "claimedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "acceptedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantityAffected" DECIMAL(18,4),
    "unitOfMeasure" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "ownerUserId" TEXT NOT NULL,
    "supplierResponse" TEXT,
    "internalAssessment" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "disposition" "ReturnDisposition",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierClaimEvidence" (
    "id" TEXT NOT NULL,
    "supplierClaimId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "description" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierClaimEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierRecovery" (
    "id" TEXT NOT NULL,
    "supplierClaimId" TEXT NOT NULL,
    "type" "SupplierRecoveryType" NOT NULL,
    "status" "SupplierRecoveryStatus" NOT NULL DEFAULT 'PROPOSED',
    "referenceNumber" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierClaim_tenantId_status_dueAt_idx" ON "SupplierClaim"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "SupplierClaim_supplierId_status_detectedAt_idx" ON "SupplierClaim"("supplierId", "status", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierClaim_tenantId_claimNumber_key" ON "SupplierClaim"("tenantId", "claimNumber");

-- CreateIndex
CREATE INDEX "SupplierClaimEvidence_supplierClaimId_createdAt_idx" ON "SupplierClaimEvidence"("supplierClaimId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierRecovery_supplierClaimId_status_idx" ON "SupplierRecovery"("supplierClaimId", "status");

-- AddForeignKey
ALTER TABLE "SupplierClaim" ADD CONSTRAINT "SupplierClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierClaim" ADD CONSTRAINT "SupplierClaim_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierClaimEvidence" ADD CONSTRAINT "SupplierClaimEvidence_supplierClaimId_fkey" FOREIGN KEY ("supplierClaimId") REFERENCES "SupplierClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRecovery" ADD CONSTRAINT "SupplierRecovery_supplierClaimId_fkey" FOREIGN KEY ("supplierClaimId") REFERENCES "SupplierClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
