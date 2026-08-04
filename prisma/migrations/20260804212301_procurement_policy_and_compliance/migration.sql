-- CreateEnum
CREATE TYPE "ProcurementPolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProcurementPolicyRuleType" AS ENUM ('APPROVAL_LIMIT', 'COMPETITIVE_BIDDING', 'CONTRACT_REQUIRED', 'PREFERRED_SUPPLIER', 'DOCUMENT_REQUIRED', 'SEGREGATION_OF_DUTIES', 'SPEND_THRESHOLD', 'COUNTRY_RESTRICTION', 'CATEGORY_RESTRICTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProcurementComplianceTestStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcurementRemediationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProcurementPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProcurementPolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "ownerUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementPolicyRule" (
    "id" TEXT NOT NULL,
    "procurementPolicyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProcurementPolicyRuleType" NOT NULL,
    "isBlocking" BOOLEAN NOT NULL DEFAULT false,
    "severity" INTEGER NOT NULL DEFAULT 3,
    "resourceType" TEXT,
    "requiredEvidence" TEXT[],
    "remediationGuidance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementPolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementComplianceTest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProcurementComplianceTestStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "compliantCount" INTEGER NOT NULL DEFAULT 0,
    "nonCompliantCount" INTEGER NOT NULL DEFAULT 0,
    "exceptionCount" INTEGER NOT NULL DEFAULT 0,
    "methodology" TEXT NOT NULL,
    "conclusion" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementComplianceTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementRemediation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "complianceTestId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProcurementRemediationStatus" NOT NULL DEFAULT 'OPEN',
    "severity" INTEGER NOT NULL DEFAULT 3,
    "ownerUserId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "blocker" TEXT,
    "completionEvidence" TEXT,
    "completedAt" TIMESTAMP(3),
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementRemediation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementPolicy_tenantId_status_effectiveAt_idx" ON "ProcurementPolicy"("tenantId", "status", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementPolicy_tenantId_code_version_key" ON "ProcurementPolicy"("tenantId", "code", "version");

-- CreateIndex
CREATE INDEX "ProcurementPolicyRule_procurementPolicyId_type_severity_idx" ON "ProcurementPolicyRule"("procurementPolicyId", "type", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementPolicyRule_procurementPolicyId_key_key" ON "ProcurementPolicyRule"("procurementPolicyId", "key");

-- CreateIndex
CREATE INDEX "ProcurementComplianceTest_tenantId_status_periodEnd_idx" ON "ProcurementComplianceTest"("tenantId", "status", "periodEnd");

-- CreateIndex
CREATE INDEX "ProcurementRemediation_tenantId_status_dueAt_idx" ON "ProcurementRemediation"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ProcurementRemediation_complianceTestId_status_idx" ON "ProcurementRemediation"("complianceTestId", "status");

-- AddForeignKey
ALTER TABLE "ProcurementPolicy" ADD CONSTRAINT "ProcurementPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementPolicyRule" ADD CONSTRAINT "ProcurementPolicyRule_procurementPolicyId_fkey" FOREIGN KEY ("procurementPolicyId") REFERENCES "ProcurementPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementComplianceTest" ADD CONSTRAINT "ProcurementComplianceTest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRemediation" ADD CONSTRAINT "ProcurementRemediation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRemediation" ADD CONSTRAINT "ProcurementRemediation_complianceTestId_fkey" FOREIGN KEY ("complianceTestId") REFERENCES "ProcurementComplianceTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
