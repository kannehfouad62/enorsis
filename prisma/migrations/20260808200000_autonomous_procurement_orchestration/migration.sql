CREATE TABLE "AutonomousProcurementOrchestrationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionHandoffId" TEXT NOT NULL,
    "executionEnvelopeId" TEXT NOT NULL,
    "targetWorkflow" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "stage" TEXT NOT NULL DEFAULT 'RELEASED_HANDOFF',
    "pauseReason" TEXT,
    "adapterJobId" TEXT,
    "nativeDraftId" TEXT,
    "nativeReferenceType" TEXT,
    "nativeReferenceId" TEXT,
    "nativeReferenceUrl" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousProcurementOrchestrationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousProcurementOrchestrationEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orchestrationRunId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT,
    "actorUserId" TEXT,
    "message" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomousProcurementOrchestrationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoOrch_handoff_key"
ON "AutonomousProcurementOrchestrationRun"("tenantId", "executionHandoffId");

CREATE INDEX "AutoOrch_status_retry_idx"
ON "AutonomousProcurementOrchestrationRun"("tenantId", "status", "nextAttemptAt");

CREATE INDEX "AutoOrch_stage_idx"
ON "AutonomousProcurementOrchestrationRun"("tenantId", "stage");

CREATE INDEX "AutoOrchEvent_run_idx"
ON "AutonomousProcurementOrchestrationEvent"("tenantId", "orchestrationRunId", "createdAt");

CREATE INDEX "AutoOrchEvent_type_idx"
ON "AutonomousProcurementOrchestrationEvent"("tenantId", "eventType");
