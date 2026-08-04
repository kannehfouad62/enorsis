-- CreateEnum
CREATE TYPE "WorkflowDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('APPROVAL', 'REVIEW', 'NOTIFICATION', 'SYSTEM_TASK', 'AI_REVIEW');

-- CreateEnum
CREATE TYPE "WorkflowRoutingMode" AS ENUM ('SEQUENTIAL', 'PARALLEL', 'ANY_ONE');

-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('PENDING', 'AVAILABLE', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'RETURNED', 'SKIPPED', 'ESCALATED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowDecision" AS ENUM ('APPROVE', 'REJECT', 'RETURN', 'COMPLETE');

-- CreateEnum
CREATE TYPE "WorkflowEscalationStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resourceType" TEXT NOT NULL,
    "status" "WorkflowDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "triggerEvent" TEXT NOT NULL,
    "conditionExpression" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WorkflowStepType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "routingMode" "WorkflowRoutingMode" NOT NULL DEFAULT 'SEQUENTIAL',
    "conditionExpression" JSONB,
    "assigneeRoles" TEXT[],
    "assigneeUserIds" TEXT[],
    "dueInHours" INTEGER,
    "escalationAfterHours" INTEGER,
    "escalationRoles" TEXT[],
    "allowDelegation" BOOLEAN NOT NULL DEFAULT true,
    "requiresComment" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "currentSequence" INTEGER NOT NULL DEFAULT 1,
    "context" JSONB,
    "startedByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTask" (
    "id" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "workflowStepId" TEXT NOT NULL,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeUserId" TEXT,
    "assigneeRole" TEXT,
    "delegatedFromUserId" TEXT,
    "availableAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decision" "WorkflowDecision",
    "comments" TEXT,
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDelegation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "delegatorUserId" TEXT NOT NULL,
    "delegateUserId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEscalation" (
    "id" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "workflowTaskId" TEXT,
    "status" "WorkflowEscalationStatus" NOT NULL DEFAULT 'PENDING',
    "escalationLevel" INTEGER NOT NULL,
    "targetRoles" TEXT[],
    "targetUserIds" TEXT[],
    "reason" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowDefinition_tenantId_resourceType_status_idx" ON "WorkflowDefinition"("tenantId", "resourceType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_tenantId_key_version_key" ON "WorkflowDefinition"("tenantId", "key", "version");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowDefinitionId_type_idx" ON "WorkflowStep"("workflowDefinitionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowDefinitionId_key_key" ON "WorkflowStep"("workflowDefinitionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowDefinitionId_sequence_key" ON "WorkflowStep"("workflowDefinitionId", "sequence");

-- CreateIndex
CREATE INDEX "WorkflowInstance_tenantId_status_createdAt_idx" ON "WorkflowInstance"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowInstance_resourceType_resourceId_idx" ON "WorkflowInstance"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_workflowDefinitionId_status_idx" ON "WorkflowInstance"("workflowDefinitionId", "status");

-- CreateIndex
CREATE INDEX "WorkflowTask_assigneeUserId_status_dueAt_idx" ON "WorkflowTask"("assigneeUserId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "WorkflowTask_assigneeRole_status_dueAt_idx" ON "WorkflowTask"("assigneeRole", "status", "dueAt");

-- CreateIndex
CREATE INDEX "WorkflowTask_workflowInstanceId_status_idx" ON "WorkflowTask"("workflowInstanceId", "status");

-- CreateIndex
CREATE INDEX "WorkflowDelegation_tenantId_delegatorUserId_isActive_idx" ON "WorkflowDelegation"("tenantId", "delegatorUserId", "isActive");

-- CreateIndex
CREATE INDEX "WorkflowDelegation_delegateUserId_startsAt_endsAt_idx" ON "WorkflowDelegation"("delegateUserId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "WorkflowEscalation_status_scheduledAt_idx" ON "WorkflowEscalation"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "WorkflowEscalation_workflowInstanceId_status_idx" ON "WorkflowEscalation"("workflowInstanceId", "status");

-- AddForeignKey
ALTER TABLE "WorkflowDefinition" ADD CONSTRAINT "WorkflowDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDelegation" ADD CONSTRAINT "WorkflowDelegation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEscalation" ADD CONSTRAINT "WorkflowEscalation_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
