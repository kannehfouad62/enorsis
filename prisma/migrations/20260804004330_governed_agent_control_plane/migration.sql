-- CreateEnum
CREATE TYPE "AiAgentTaskStatus" AS ENUM ('DRAFT', 'QUEUED', 'WAITING_APPROVAL', 'APPROVED', 'RUNNING', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiAgentTaskType" AS ENUM ('SUPPLIER_DUE_DILIGENCE', 'RFX_DRAFT', 'NEGOTIATION_PLAN', 'CONTRACT_REVIEW', 'SPEND_OPPORTUNITY', 'RISK_MONITORING', 'EXECUTIVE_BRIEF', 'INVOICE_EXCEPTION_ANALYSIS');

-- CreateEnum
CREATE TYPE "AiAgentApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');

-- CreateTable
CREATE TABLE "AiAgentTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "AiAgentTaskType" NOT NULL,
    "status" "AiAgentTaskStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "policySnapshot" JSONB,
    "contextSnapshot" JSONB,
    "output" TEXT,
    "confidence" INTEGER,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentTaskApproval" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "decision" "AiAgentApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgentTaskApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentTaskAttempt" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "aiExecutionId" TEXT,
    "attemptNumber" INTEGER NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "inputSnapshot" JSONB,
    "outputSnapshot" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "AiAgentTaskAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAgentTask_tenantId_status_priority_createdAt_idx" ON "AiAgentTask"("tenantId", "status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "AiAgentTask_agentId_status_idx" ON "AiAgentTask"("agentId", "status");

-- CreateIndex
CREATE INDEX "AiAgentTask_resourceType_resourceId_idx" ON "AiAgentTask"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AiAgentTaskApproval_approverUserId_decision_idx" ON "AiAgentTaskApproval"("approverUserId", "decision");

-- CreateIndex
CREATE INDEX "AiAgentTaskApproval_taskId_sequence_idx" ON "AiAgentTaskApproval"("taskId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgentTaskApproval_taskId_approverUserId_sequence_key" ON "AiAgentTaskApproval"("taskId", "approverUserId", "sequence");

-- CreateIndex
CREATE INDEX "AiAgentTaskAttempt_taskId_startedAt_idx" ON "AiAgentTaskAttempt"("taskId", "startedAt");

-- CreateIndex
CREATE INDEX "AiAgentTaskAttempt_aiExecutionId_idx" ON "AiAgentTaskAttempt"("aiExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgentTaskAttempt_taskId_attemptNumber_key" ON "AiAgentTaskAttempt"("taskId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "AiAgentTask" ADD CONSTRAINT "AiAgentTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentTask" ADD CONSTRAINT "AiAgentTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentTaskApproval" ADD CONSTRAINT "AiAgentTaskApproval_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AiAgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentTaskAttempt" ADD CONSTRAINT "AiAgentTaskAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AiAgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
