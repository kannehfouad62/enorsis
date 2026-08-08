-- CreateEnum
CREATE TYPE "EnterpriseAutomationRuntimeActionStatus" AS ENUM ('PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnterpriseAutomationRuntimeCallbackStatus" AS ENUM ('RECEIVED', 'ACCEPTED', 'REJECTED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "EnterpriseAutomationRuntimeAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "runtimeNodeId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EnterpriseAutomationRuntimeActionStatus" NOT NULL DEFAULT 'PENDING',
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "externalReference" TEXT,
    "dispatchCount" INTEGER NOT NULL DEFAULT 0,
    "lastDispatchedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAutomationRuntimeAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAutomationRuntimeCallback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "callbackKey" TEXT NOT NULL,
    "status" "EnterpriseAutomationRuntimeCallbackStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "source" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "EnterpriseAutomationRuntimeCallback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeAction_executionId_status_create_idx" ON "EnterpriseAutomationRuntimeAction"("executionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeAction_runtimeNodeId_status_idx" ON "EnterpriseAutomationRuntimeAction"("runtimeNodeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationRuntimeAction_tenantId_idempotencyKey_key" ON "EnterpriseAutomationRuntimeAction"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "EnterpriseAutomationRuntimeCallback_actionId_status_receive_idx" ON "EnterpriseAutomationRuntimeCallback"("actionId", "status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationRuntimeCallback_tenantId_callbackKey_key" ON "EnterpriseAutomationRuntimeCallback"("tenantId", "callbackKey");

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeAction" ADD CONSTRAINT "EnterpriseAutomationRuntimeAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeAction" ADD CONSTRAINT "EnterpriseAutomationRuntimeAction_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "EnterpriseAutomationRuntimeExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeAction" ADD CONSTRAINT "EnterpriseAutomationRuntimeAction_runtimeNodeId_fkey" FOREIGN KEY ("runtimeNodeId") REFERENCES "EnterpriseAutomationRuntimeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeCallback" ADD CONSTRAINT "EnterpriseAutomationRuntimeCallback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationRuntimeCallback" ADD CONSTRAINT "EnterpriseAutomationRuntimeCallback_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "EnterpriseAutomationRuntimeAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
