-- CreateEnum
CREATE TYPE "EnterpriseAutomationConnectorAuditType" AS ENUM ('CREATED', 'UPDATED', 'ACTIVATED', 'DISABLED', 'ARCHIVED', 'TESTED', 'EXECUTED', 'EXECUTION_FAILED', 'POLICY_BLOCKED');

-- AlterTable
ALTER TABLE "EnterpriseAutomationConnector" ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFailureAt" TIMESTAMP(3),
ADD COLUMN     "lastFailureMessage" TEXT,
ADD COLUMN     "maxDailyExecutions" INTEGER,
ADD COLUMN     "ownerUserId" TEXT,
ADD COLUMN     "policyTag" TEXT,
ADD COLUMN     "successCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EnterpriseAutomationConnectorAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "type" "EnterpriseAutomationConnectorAuditType" NOT NULL,
    "actorUserId" TEXT,
    "actionId" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseAutomationConnectorAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseAutomationConnectorAudit_tenantId_createdAt_idx" ON "EnterpriseAutomationConnectorAudit"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationConnectorAudit_connectorId_createdAt_idx" ON "EnterpriseAutomationConnectorAudit"("connectorId", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationConnectorAudit_connectorId_type_created_idx" ON "EnterpriseAutomationConnectorAudit"("connectorId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationConnectorAudit" ADD CONSTRAINT "EnterpriseAutomationConnectorAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationConnectorAudit" ADD CONSTRAINT "EnterpriseAutomationConnectorAudit_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "EnterpriseAutomationConnector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
