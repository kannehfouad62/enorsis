-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseRequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "siteId" TEXT,
    "departmentId" TEXT,
    "requestNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "businessJustification" TEXT NOT NULL,
    "priority" "PurchaseRequestPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "neededByDate" TIMESTAMP(3),
    "originalCurrency" TEXT NOT NULL DEFAULT 'USD',
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "usdEquivalent" DECIMAL(18,2) NOT NULL,
    "exchangeRateToUsd" DECIMAL(24,12) NOT NULL,
    "exchangeRateSource" TEXT NOT NULL,
    "exchangeRateDate" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestLine" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "supplierSuggestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequestLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestApproval" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequestApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseRequest_tenantId_status_createdAt_idx" ON "PurchaseRequest"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_requesterId_status_idx" ON "PurchaseRequest"("requesterId", "status");

-- CreateIndex
CREATE INDEX "PurchaseRequest_legalEntityId_idx" ON "PurchaseRequest"("legalEntityId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_siteId_idx" ON "PurchaseRequest"("siteId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_departmentId_idx" ON "PurchaseRequest"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_tenantId_requestNumber_key" ON "PurchaseRequest"("tenantId", "requestNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequestLine_purchaseRequestId_idx" ON "PurchaseRequestLine"("purchaseRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequestLine_purchaseRequestId_lineNumber_key" ON "PurchaseRequestLine"("purchaseRequestId", "lineNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequestApproval_approverId_decision_idx" ON "PurchaseRequestApproval"("approverId", "decision");

-- CreateIndex
CREATE INDEX "PurchaseRequestApproval_purchaseRequestId_sequence_idx" ON "PurchaseRequestApproval"("purchaseRequestId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequestApproval_purchaseRequestId_approverId_sequen_key" ON "PurchaseRequestApproval"("purchaseRequestId", "approverId", "sequence");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestLine" ADD CONSTRAINT "PurchaseRequestLine_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestApproval" ADD CONSTRAINT "PurchaseRequestApproval_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestApproval" ADD CONSTRAINT "PurchaseRequestApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
