CREATE TABLE "ClosedLoopProcurementOutcome" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orchestrationRunId" TEXT NOT NULL,
    "executionHandoffId" TEXT NOT NULL,
    "targetWorkflow" TEXT NOT NULL,
    "nativeReferenceType" TEXT,
    "nativeReferenceId" TEXT,
    "nativeReferenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "sourceConfidence" DOUBLE PRECISION,
    "outcomeQuality" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validatedByUserId" TEXT,
    "validationNote" TEXT,
    "sourceSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClosedLoopProcurementOutcome_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClosedLoopProcurementOutcomeMetric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "metricLabel" TEXT NOT NULL,
    "unit" TEXT,
    "predictedValue" DOUBLE PRECISION,
    "actualValue" DOUBLE PRECISION,
    "varianceValue" DOUBLE PRECISION,
    "variancePercent" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PREDICTED',
    "evidence" JSONB,
    "observedByUserId" TEXT,
    "observedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClosedLoopProcurementOutcomeMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClosedOutcome_run_key"
ON "ClosedLoopProcurementOutcome"("tenantId", "orchestrationRunId");

CREATE INDEX "ClosedOutcome_status_idx"
ON "ClosedLoopProcurementOutcome"("tenantId", "status");

CREATE INDEX "ClosedOutcome_workflow_idx"
ON "ClosedLoopProcurementOutcome"("tenantId", "targetWorkflow");

CREATE UNIQUE INDEX "ClosedMetric_outcome_key"
ON "ClosedLoopProcurementOutcomeMetric"("tenantId", "outcomeId", "metricKey");

CREATE INDEX "ClosedMetric_metric_idx"
ON "ClosedLoopProcurementOutcomeMetric"("tenantId", "metricKey", "status");

CREATE INDEX "ClosedMetric_outcome_idx"
ON "ClosedLoopProcurementOutcomeMetric"("tenantId", "outcomeId");
