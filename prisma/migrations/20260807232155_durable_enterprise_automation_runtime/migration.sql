-- CreateEnum
CREATE TYPE "EnterpriseAutomationRuntimeStatus" AS ENUM ('RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnterpriseAutomationRuntimeNodeStatus" AS ENUM ('READY', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EnterpriseAutomationRuntimeSignalType" AS ENUM ('APPROVAL', 'RESUME', 'CANCEL');

-- CreateTable
CREATE TABLE "EnterpriseAutomationRuntimeExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "versionId" TEXT,
    "executionNumber" TEXT NOT NULL,
    "status" "EnterpriseAutomationRuntimeStatus" NOT NULL DEFAULT 'RUNNING',
    "graphSnapshot" JSONB NOT NULL,
    "input" JSONB NOT NULL,
    "context" JSONB,
    "wakeAt" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAutomationRuntimeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationRuntimeNode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "branchKey" TEXT,
    "status" "EnterpriseAutomationRuntimeNodeStatus" NOT NULL DEFAULT 'READY',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3),
    "timeoutAt" TIMESTAMP(3),
    "waitReason" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAutomationRuntimeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationRuntimeSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "signalType" "EnterpriseAutomationRuntimeSignalType" NOT NULL,
    "correlationKey" TEXT NOT NULL,
    "payload" JSONB,
    "consumedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseAutomationRuntimeSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeExecution_tenantId_status_wakeAt_idx" ON "EnterpriseAutomationRuntimeExecution"("tenantId", "status", "wakeAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeExecution_ruleId_createdAt_idx" ON "EnterpriseAutomationRuntimeExecution"("ruleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationRuntimeExecution_tenantId_executionNumb_key" ON "EnterpriseAutomationRuntimeExecution"("tenantId", "executionNumber");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeNode_tenantId_status_availableAt_idx" ON "EnterpriseAutomationRuntimeNode"("tenantId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeNode_executionId_status_idx" ON "EnterpriseAutomationRuntimeNode"("executionId", "status");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeNode_executionId_nodeId_idx" ON "EnterpriseAutomationRuntimeNode"("executionId", "nodeId");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeSignal_tenantId_signalType_consu_idx" ON "EnterpriseAutomationRuntimeSignal"("tenantId", "signalType", "consumedAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeSignal_executionId_correlationKe_idx" ON "EnterpriseAutomationRuntimeSignal"("executionId", "correlationKey", "consumedAt");

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeExecution" ADD CONSTRAINT "EnterpriseAutomationRuntimeExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeExecution" ADD CONSTRAINT "EnterpriseAutomationRuntimeExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EnterpriseAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeNode" ADD CONSTRAINT "EnterpriseAutomationRuntimeNode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeNode" ADD CONSTRAINT "EnterpriseAutomationRuntimeNode_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "EnterpriseAutomationRuntimeExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeSignal" ADD CONSTRAINT "EnterpriseAutomationRuntimeSignal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeSignal" ADD CONSTRAINT "EnterpriseAutomationRuntimeSignal_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "EnterpriseAutomationRuntimeExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
