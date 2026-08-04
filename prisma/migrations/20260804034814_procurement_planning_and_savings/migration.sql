-- CreateEnum
CREATE TYPE "ProcurementPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CategoryStrategyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SavingsInitiativeStatus" AS ENUM ('IDEA', 'VALIDATED', 'APPROVED', 'IN_EXECUTION', 'REALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SavingsInitiativeType" AS ENUM ('COST_REDUCTION', 'COST_AVOIDANCE', 'WORKING_CAPITAL', 'DEMAND_REDUCTION', 'PROCESS_EFFICIENCY', 'RISK_AVOIDANCE');

-- CreateEnum
CREATE TYPE "SavingsMilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateTable
CREATE TABLE "ProcurementPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "status" "ProcurementPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "objective" TEXT NOT NULL,
    "approvedBudget" DECIMAL(18,2) NOT NULL,
    "committedSpend" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actualSpend" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "savingsTarget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "realizedSavings" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ownerUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryStrategy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "procurementPlanId" TEXT,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CategoryStrategyStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerUserId" TEXT NOT NULL,
    "currentSpend" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "addressableSpend" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "savingsTarget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "supplierCount" INTEGER NOT NULL DEFAULT 0,
    "riskSummary" TEXT,
    "marketSummary" TEXT,
    "strategySummary" TEXT NOT NULL,
    "sourcingApproach" TEXT,
    "contractApproach" TEXT,
    "supplierApproach" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "targetCompletionAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsInitiative" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "procurementPlanId" TEXT,
    "categoryStrategyId" TEXT,
    "initiativeNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SavingsInitiativeType" NOT NULL,
    "status" "SavingsInitiativeStatus" NOT NULL DEFAULT 'IDEA',
    "category" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "baselineAmount" DECIMAL(18,2) NOT NULL,
    "targetSavings" DECIMAL(18,2) NOT NULL,
    "validatedSavings" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "realizedSavings" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "confidencePercent" INTEGER NOT NULL DEFAULT 50,
    "financeValidatedBy" TEXT,
    "financeValidatedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "targetRealizationAt" TIMESTAMP(3) NOT NULL,
    "realizedAt" TIMESTAMP(3),
    "sourceType" TEXT,
    "sourceId" TEXT,
    "assumptions" TEXT,
    "risks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsInitiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsMilestone" (
    "id" TEXT NOT NULL,
    "savingsInitiativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SavingsMilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerUserId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementPlan_tenantId_status_fiscalYear_idx" ON "ProcurementPlan"("tenantId", "status", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementPlan_tenantId_fiscalYear_name_key" ON "ProcurementPlan"("tenantId", "fiscalYear", "name");

-- CreateIndex
CREATE INDEX "CategoryStrategy_tenantId_status_category_idx" ON "CategoryStrategy"("tenantId", "status", "category");

-- CreateIndex
CREATE INDEX "CategoryStrategy_procurementPlanId_idx" ON "CategoryStrategy"("procurementPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryStrategy_tenantId_name_key" ON "CategoryStrategy"("tenantId", "name");

-- CreateIndex
CREATE INDEX "SavingsInitiative_tenantId_status_targetRealizationAt_idx" ON "SavingsInitiative"("tenantId", "status", "targetRealizationAt");

-- CreateIndex
CREATE INDEX "SavingsInitiative_procurementPlanId_idx" ON "SavingsInitiative"("procurementPlanId");

-- CreateIndex
CREATE INDEX "SavingsInitiative_categoryStrategyId_idx" ON "SavingsInitiative"("categoryStrategyId");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsInitiative_tenantId_initiativeNumber_key" ON "SavingsInitiative"("tenantId", "initiativeNumber");

-- CreateIndex
CREATE INDEX "SavingsMilestone_savingsInitiativeId_status_dueAt_idx" ON "SavingsMilestone"("savingsInitiativeId", "status", "dueAt");

-- AddForeignKey
ALTER TABLE "ProcurementPlan" ADD CONSTRAINT "ProcurementPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryStrategy" ADD CONSTRAINT "CategoryStrategy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryStrategy" ADD CONSTRAINT "CategoryStrategy_procurementPlanId_fkey" FOREIGN KEY ("procurementPlanId") REFERENCES "ProcurementPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsInitiative" ADD CONSTRAINT "SavingsInitiative_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsInitiative" ADD CONSTRAINT "SavingsInitiative_procurementPlanId_fkey" FOREIGN KEY ("procurementPlanId") REFERENCES "ProcurementPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsInitiative" ADD CONSTRAINT "SavingsInitiative_categoryStrategyId_fkey" FOREIGN KEY ("categoryStrategyId") REFERENCES "CategoryStrategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsMilestone" ADD CONSTRAINT "SavingsMilestone_savingsInitiativeId_fkey" FOREIGN KEY ("savingsInitiativeId") REFERENCES "SavingsInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
