CREATE TABLE "AutonomousProcurementOrchestrationSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orchestrationRunId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "actorUserId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'INTERNAL',
    "payload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousProcurementOrchestrationSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoOrchSignal_idem_key"
ON "AutonomousProcurementOrchestrationSignal"("tenantId", "idempotencyKey");

CREATE INDEX "AutoOrchSignal_run_idx"
ON "AutonomousProcurementOrchestrationSignal"("tenantId", "orchestrationRunId", "receivedAt");

CREATE INDEX "AutoOrchSignal_status_idx"
ON "AutonomousProcurementOrchestrationSignal"("tenantId", "status", "receivedAt");
