-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MASTER_SERVICE_AGREEMENT', 'PURCHASE_AGREEMENT', 'FRAMEWORK_AGREEMENT', 'STATEMENT_OF_WORK', 'NDA', 'SOFTWARE_LICENSE', 'PROFESSIONAL_SERVICES', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ContractApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ContractObligationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "ContractDocumentType" AS ENUM ('DRAFT', 'EXECUTED', 'AMENDMENT', 'EXHIBIT', 'SUPPORTING');

-- CreateEnum
CREATE TYPE "ClauseRiskLevel" AS ENUM ('STANDARD', 'REVIEW', 'HIGH', 'PROHIBITED');

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourcingEventId" TEXT,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "riskLevel" "ContractRiskLevel" NOT NULL DEFAULT 'MODERATE',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "totalValue" DECIMAL(18,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalNoticeDays" INTEGER NOT NULL DEFAULT 90,
    "governingLaw" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "summary" TEXT,
    "approvedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClauseTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "riskLevel" "ClauseRiskLevel" NOT NULL DEFAULT 'STANDARD',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClauseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractClause" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "clauseTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "riskLevel" "ClauseRiskLevel" NOT NULL DEFAULT 'STANDARD',
    "sequence" INTEGER NOT NULL,
    "negotiated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractClause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractApproval" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "decision" "ContractApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractObligation" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "status" "ContractObligationStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "ContractDocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractRiskReview" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "riskLevel" "ContractRiskLevel" NOT NULL,
    "legalRisk" INTEGER NOT NULL,
    "commercialRisk" INTEGER NOT NULL,
    "dataPrivacyRisk" INTEGER NOT NULL,
    "complianceRisk" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractRiskReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_tenantId_status_endDate_idx" ON "Contract"("tenantId", "status", "endDate");

-- CreateIndex
CREATE INDEX "Contract_supplierId_status_idx" ON "Contract"("supplierId", "status");

-- CreateIndex
CREATE INDEX "Contract_sourcingEventId_idx" ON "Contract"("sourcingEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_tenantId_contractNumber_key" ON "Contract"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "ClauseTemplate_tenantId_category_isActive_idx" ON "ClauseTemplate"("tenantId", "category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClauseTemplate_tenantId_key_version_key" ON "ClauseTemplate"("tenantId", "key", "version");

-- CreateIndex
CREATE INDEX "ContractClause_contractId_riskLevel_idx" ON "ContractClause"("contractId", "riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ContractClause_contractId_sequence_key" ON "ContractClause"("contractId", "sequence");

-- CreateIndex
CREATE INDEX "ContractApproval_approverUserId_decision_idx" ON "ContractApproval"("approverUserId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "ContractApproval_contractId_approverUserId_sequence_key" ON "ContractApproval"("contractId", "approverUserId", "sequence");

-- CreateIndex
CREATE INDEX "ContractObligation_contractId_status_dueDate_idx" ON "ContractObligation"("contractId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "ContractObligation_ownerUserId_status_idx" ON "ContractObligation"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "ContractDocument_contractId_type_idx" ON "ContractDocument"("contractId", "type");

-- CreateIndex
CREATE INDEX "ContractRiskReview_contractId_reviewedAt_idx" ON "ContractRiskReview"("contractId", "reviewedAt");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseTemplate" ADD CONSTRAINT "ClauseTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractClause" ADD CONSTRAINT "ContractClause_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractApproval" ADD CONSTRAINT "ContractApproval_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractObligation" ADD CONSTRAINT "ContractObligation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRiskReview" ADD CONSTRAINT "ContractRiskReview_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
