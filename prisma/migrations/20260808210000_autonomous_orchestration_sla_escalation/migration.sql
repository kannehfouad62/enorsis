CREATE TABLE "AutonomousProcurementOrchestrationEscalation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orchestrationRunId" TEXT NOT NULL,
    "escalationType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "stage" TEXT NOT NULL,
    "runStatus" TEXT NOT NULL,
    "ageMinutes" INTEGER NOT NULL,
    "thresholdMinutes" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "acknowledgedByUserId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousProcurementOrchestrationEscalation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoOrchEsc_run_type_key"
ON "AutonomousProcurementOrchestrationEscalation"("tenantId", "orchestrationRunId", "escalationType");

CREATE INDEX "AutoOrchEsc_status_sev_idx"
ON "AutonomousProcurementOrchestrationEscalation"("tenantId", "status", "severity");

CREATE INDEX "AutoOrchEsc_run_idx"
ON "AutonomousProcurementOrchestrationEscalation"("tenantId", "orchestrationRunId");
