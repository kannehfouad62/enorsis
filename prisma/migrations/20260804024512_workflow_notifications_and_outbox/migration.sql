-- CreateEnum
CREATE TYPE "WorkflowNotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "WorkflowNotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowNotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'TASK_ESCALATED', 'WORKFLOW_COMPLETED', 'WORKFLOW_REJECTED', 'DELEGATION_STARTED', 'DELEGATION_ENDING');

-- CreateTable
CREATE TABLE "WorkflowNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowInstanceId" TEXT,
    "workflowTaskId" TEXT,
    "recipientUserId" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "type" "WorkflowNotificationType" NOT NULL,
    "channel" "WorkflowNotificationChannel" NOT NULL,
    "status" "WorkflowNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "deduplicationKey" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStartedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowNotification_tenantId_recipientUserId_status_create_idx" ON "WorkflowNotification"("tenantId", "recipientUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowNotification_status_scheduledAt_nextAttemptAt_idx" ON "WorkflowNotification"("status", "scheduledAt", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WorkflowNotification_workflowTaskId_idx" ON "WorkflowNotification"("workflowTaskId");

-- CreateIndex
CREATE INDEX "WorkflowNotification_workflowInstanceId_idx" ON "WorkflowNotification"("workflowInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowNotification_tenantId_deduplicationKey_key" ON "WorkflowNotification"("tenantId", "deduplicationKey");

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
