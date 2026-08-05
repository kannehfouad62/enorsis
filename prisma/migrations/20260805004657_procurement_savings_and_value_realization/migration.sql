-- CreateEnum
CREATE TYPE "ProcurementValueInitiativeStatus" AS ENUM ('IDEA', 'QUALIFYING', 'APPROVED', 'IN_PROGRESS', 'REALIZING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcurementBenefitType" AS ENUM ('COST_REDUCTION', 'COST_AVOIDANCE', 'WORKING_CAPITAL', 'REVENUE_ENABLEMENT', 'RISK_REDUCTION', 'PRODUCTIVITY', 'SUSTAINABILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcurementBenefitFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ProcurementBenefitValidationStatus" AS ENUM ('UNVALIDATED', 'SUBMITTED', 'FINANCE_VALIDATED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProcurementValueMilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProcurementValueInitiative" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "initiativeNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProcurementValueInitiativeStatus" NOT NULL DEFAULT 'IDEA',
    "category" TEXT,
    "supplierId" TEXT,
    "sourcingEventId" TEXT,
    "contractId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "financeOwnerUserId" TEXT,
    "executiveSponsorUserId" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "baselineAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "targetBenefitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "forecastBenefitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "realizedBenefitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "leakageAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "probabilityPercent" INTEGER NOT NULL DEFAULT 50,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "targetCompletionAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "assumptions" TEXT,
    "risks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementValueInitiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementBenefit" (
    "id" TEXT NOT NULL,
    "procurementValueInitiativeId" TEXT NOT NULL,
    "type" "ProcurementBenefitType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "ProcurementBenefitFrequency" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "forecastAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "claimedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "validatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "realizedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "validationStatus" "ProcurementBenefitValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "methodology" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementValueMilestone" (
    "id" TEXT NOT NULL,
    "procurementValueInitiativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "ProcurementValueMilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerUserId" TEXT NOT NULL,
    "completionEvidence" TEXT,
    "blocker" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementValueMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementValueInitiative_tenantId_status_targetCompletion_idx" ON "ProcurementValueInitiative"("tenantId", "status", "targetCompletionAt");

-- CreateIndex
CREATE INDEX "ProcurementValueInitiative_supplierId_status_idx" ON "ProcurementValueInitiative"("supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementValueInitiative_tenantId_initiativeNumber_key" ON "ProcurementValueInitiative"("tenantId", "initiativeNumber");

-- CreateIndex
CREATE INDEX "ProcurementBenefit_procurementValueInitiativeId_validationS_idx" ON "ProcurementBenefit"("procurementValueInitiativeId", "validationStatus", "periodStart");

-- CreateIndex
CREATE INDEX "ProcurementValueMilestone_procurementValueInitiativeId_stat_idx" ON "ProcurementValueMilestone"("procurementValueInitiativeId", "status", "dueAt");

-- AddForeignKey
ALTER TABLE "ProcurementValueInitiative" ADD CONSTRAINT "ProcurementValueInitiative_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementBenefit" ADD CONSTRAINT "ProcurementBenefit_procurementValueInitiativeId_fkey" FOREIGN KEY ("procurementValueInitiativeId") REFERENCES "ProcurementValueInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementValueMilestone" ADD CONSTRAINT "ProcurementValueMilestone_procurementValueInitiativeId_fkey" FOREIGN KEY ("procurementValueInitiativeId") REFERENCES "ProcurementValueInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
