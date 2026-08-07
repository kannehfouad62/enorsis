-- CreateEnum
CREATE TYPE "EnterpriseAutomationRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "EnterpriseAutomationTriggerType" AS ENUM ('DOMAIN_EVENT', 'SCHEDULE', 'RECORD_CONDITION', 'MANUAL');

-- CreateEnum
CREATE TYPE "EnterpriseAutomationActionType" AS ENUM ('START_WORKFLOW', 'CREATE_NOTIFICATION', 'CREATE_TASK', 'PUBLISH_EVENT', 'LOG_ACTIVITY');

-- CreateEnum
CREATE TYPE "EnterpriseAutomationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "EnterpriseAutomationRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EnterpriseAutomationRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "stopOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationTrigger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggerType" "EnterpriseAutomationTriggerType" NOT NULL,
    "eventType" TEXT,
    "scheduleExpression" TEXT,
    "recordType" TEXT,
    "conditionExpression" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAutomationTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "actionType" "EnterpriseAutomationActionType" NOT NULL,
    "actionKey" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAutomationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "status" "EnterpriseAutomationRunStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" "EnterpriseAutomationTriggerType" NOT NULL,
    "triggerReference" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "input" JSONB,
    "output" JSONB,
    "errorMessage" TEXT,
    "initiatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseAutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationActionRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "automationRunId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "EnterpriseAutomationRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "output" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseAutomationActionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRule_tenantId_status_priority_idx" ON "EnterpriseAutomationRule"("tenantId", "status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationRule_tenantId_ruleKey_key" ON "EnterpriseAutomationRule"("tenantId", "ruleKey");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationTrigger_tenantId_triggerType_enabled_idx" ON "EnterpriseAutomationTrigger"("tenantId", "triggerType", "enabled");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationTrigger_ruleId_idx" ON "EnterpriseAutomationTrigger"("ruleId");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationTrigger_eventType_idx" ON "EnterpriseAutomationTrigger"("eventType");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationAction_tenantId_actionType_enabled_idx" ON "EnterpriseAutomationAction"("tenantId", "actionType", "enabled");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationAction_ruleId_idx" ON "EnterpriseAutomationAction"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationAction_ruleId_sequence_key" ON "EnterpriseAutomationAction"("ruleId", "sequence");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRun_tenantId_status_createdAt_idx" ON "EnterpriseAutomationRun"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRun_ruleId_createdAt_idx" ON "EnterpriseAutomationRun"("ruleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationRun_tenantId_runNumber_key" ON "EnterpriseAutomationRun"("tenantId", "runNumber");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationActionRun_tenantId_status_createdAt_idx" ON "EnterpriseAutomationActionRun"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationActionRun_automationRunId_sequence_idx" ON "EnterpriseAutomationActionRun"("automationRunId", "sequence");

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRule" ADD CONSTRAINT "EnterpriseAutomationRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationTrigger" ADD CONSTRAINT "EnterpriseAutomationTrigger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationTrigger" ADD CONSTRAINT "EnterpriseAutomationTrigger_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EnterpriseAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationAction" ADD CONSTRAINT "EnterpriseAutomationAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationAction" ADD CONSTRAINT "EnterpriseAutomationAction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EnterpriseAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRun" ADD CONSTRAINT "EnterpriseAutomationRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRun" ADD CONSTRAINT "EnterpriseAutomationRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EnterpriseAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationActionRun" ADD CONSTRAINT "EnterpriseAutomationActionRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationActionRun" ADD CONSTRAINT "EnterpriseAutomationActionRun_automationRunId_fkey" FOREIGN KEY ("automationRunId") REFERENCES "EnterpriseAutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationActionRun" ADD CONSTRAINT "EnterpriseAutomationActionRun_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "EnterpriseAutomationAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
