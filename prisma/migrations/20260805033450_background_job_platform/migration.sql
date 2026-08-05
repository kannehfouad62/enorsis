-- CreateEnum
CREATE TYPE "PlatformJobStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PlatformJobExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "PlatformJobTriggerType" AS ENUM ('SCHEDULED', 'MANUAL', 'EVENT', 'RETRY');

-- CreateTable
CREATE TABLE "PlatformJobDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlatformJobStatus" NOT NULL DEFAULT 'ACTIVE',
    "handlerKey" TEXT NOT NULL,
    "scheduleExpression" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "retryDelaySeconds" INTEGER NOT NULL DEFAULT 300,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 300,
    "concurrencyKey" TEXT,
    "tenantScoped" BOOLEAN NOT NULL DEFAULT false,
    "payloadTemplate" JSONB,
    "lastQueuedAt" TIMESTAMP(3),
    "lastStartedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "lastSucceededAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformJobDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformJobExecution" (
    "id" TEXT NOT NULL,
    "jobDefinitionId" TEXT NOT NULL,
    "tenantId" TEXT,
    "status" "PlatformJobExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerType" "PlatformJobTriggerType" NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "requestedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformJobExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformJobAttempt" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PlatformJobExecutionStatus" NOT NULL,
    "workerId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformJobAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformJobDefinition_key_key" ON "PlatformJobDefinition"("key");

-- CreateIndex
CREATE INDEX "PlatformJobDefinition_status_nextRunAt_idx" ON "PlatformJobDefinition"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "PlatformJobDefinition_handlerKey_idx" ON "PlatformJobDefinition"("handlerKey");

-- CreateIndex
CREATE INDEX "PlatformJobExecution_status_queuedAt_idx" ON "PlatformJobExecution"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "PlatformJobExecution_jobDefinitionId_status_idx" ON "PlatformJobExecution"("jobDefinitionId", "status");

-- CreateIndex
CREATE INDEX "PlatformJobExecution_tenantId_status_idx" ON "PlatformJobExecution"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PlatformJobExecution_correlationId_idx" ON "PlatformJobExecution"("correlationId");

-- CreateIndex
CREATE INDEX "PlatformJobAttempt_status_startedAt_idx" ON "PlatformJobAttempt"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformJobAttempt_executionId_attemptNumber_key" ON "PlatformJobAttempt"("executionId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "PlatformJobExecution" ADD CONSTRAINT "PlatformJobExecution_jobDefinitionId_fkey" FOREIGN KEY ("jobDefinitionId") REFERENCES "PlatformJobDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformJobExecution" ADD CONSTRAINT "PlatformJobExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformJobAttempt" ADD CONSTRAINT "PlatformJobAttempt_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "PlatformJobExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
