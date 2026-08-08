CREATE TABLE "AutonomousExecutionAdapterJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionHandoffId" TEXT NOT NULL,
    "executionEnvelopeId" TEXT NOT NULL,
    "targetWorkflow" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "nativeRoute" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT_READY',
    "idempotencyKey" TEXT NOT NULL,
    "draftPayload" JSONB NOT NULL,
    "validationSnapshot" JSONB NOT NULL,
    "nativeReferenceType" TEXT,
    "nativeReferenceId" TEXT,
    "nativeReferenceUrl" TEXT,
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousExecutionAdapterJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousExecutionAdapterDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adapterJobId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomousExecutionAdapterDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoAdapter_idempotency_key"
ON "AutonomousExecutionAdapterJob"("tenantId", "idempotencyKey");

CREATE UNIQUE INDEX "AutoAdapter_handoff_key"
ON "AutonomousExecutionAdapterJob"("tenantId", "executionHandoffId");

CREATE INDEX "AutoAdapter_status_idx"
ON "AutonomousExecutionAdapterJob"("tenantId", "status");

CREATE INDEX "AutoAdapter_workflow_idx"
ON "AutonomousExecutionAdapterJob"("tenantId", "targetWorkflow");

CREATE INDEX "AutoAdapterDecision_job_idx"
ON "AutonomousExecutionAdapterDecision"("tenantId", "adapterJobId", "createdAt");

CREATE INDEX "AutoAdapterDecision_type_idx"
ON "AutonomousExecutionAdapterDecision"("tenantId", "decision");
