-- CreateEnum
CREATE TYPE "EnterpriseAutomationRuleVersionStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnterpriseAutomationSimulationStatus" AS ENUM ('PASSED', 'FAILED', 'WARNING');

-- AlterTable
ALTER TABLE "EnterpriseAutomationRule" ADD COLUMN     "designerState" JSONB,
ADD COLUMN     "lastValidatedAt" TIMESTAMP(3),
ADD COLUMN     "publishedVersion" INTEGER;

-- CreateTable
CREATE TABLE "EnterpriseAutomationRuleVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "EnterpriseAutomationRuleVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "designerState" JSONB NOT NULL,
    "validationReport" JSONB,
    "changeSummary" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseAutomationRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "templateKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "designerState" JSONB NOT NULL,
    "systemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAutomationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationSimulation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "versionId" TEXT,
    "status" "EnterpriseAutomationSimulationStatus" NOT NULL,
    "input" JSONB NOT NULL,
    "matched" BOOLEAN NOT NULL,
    "conditionTrace" JSONB NOT NULL,
    "actionPreview" JSONB NOT NULL,
    "warnings" JSONB,
    "simulatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseAutomationSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuleVersion_tenantId_status_createdAt_idx" ON "EnterpriseAutomationRuleVersion"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationRuleVersion_ruleId_versionNumber_key" ON "EnterpriseAutomationRuleVersion"("ruleId", "versionNumber");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationTemplate_tenantId_category_active_idx" ON "EnterpriseAutomationTemplate"("tenantId", "category", "active");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationTemplate_systemTemplate_active_idx" ON "EnterpriseAutomationTemplate"("systemTemplate", "active");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationTemplate_tenantId_templateKey_key" ON "EnterpriseAutomationTemplate"("tenantId", "templateKey");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationSimulation_tenantId_status_createdAt_idx" ON "EnterpriseAutomationSimulation"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationSimulation_ruleId_createdAt_idx" ON "EnterpriseAutomationSimulation"("ruleId", "createdAt");

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuleVersion" ADD CONSTRAINT "EnterpriseAutomationRuleVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuleVersion" ADD CONSTRAINT "EnterpriseAutomationRuleVersion_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EnterpriseAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationTemplate" ADD CONSTRAINT "EnterpriseAutomationTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationSimulation" ADD CONSTRAINT "EnterpriseAutomationSimulation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationSimulation" ADD CONSTRAINT "EnterpriseAutomationSimulation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EnterpriseAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationSimulation" ADD CONSTRAINT "EnterpriseAutomationSimulation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "EnterpriseAutomationRuleVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
