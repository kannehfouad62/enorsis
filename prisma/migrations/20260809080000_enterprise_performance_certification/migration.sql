CREATE TABLE "EnterprisePerformanceCertificationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "triggeredByUserId" TEXT,
    "certificationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScenarios" INTEGER NOT NULL DEFAULT 0,
    "passedScenarios" INTEGER NOT NULL DEFAULT 0,
    "warningScenarios" INTEGER NOT NULL DEFAULT 0,
    "failedScenarios" INTEGER NOT NULL DEFAULT 0,
    "averageLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p95LatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnterprisePerformanceCertificationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterprisePerformanceCertificationResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "certificationRunId" TEXT NOT NULL,
    "scenarioKey" TEXT NOT NULL,
    "scenarioLabel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "latencyMs" DOUBLE PRECISION NOT NULL,
    "thresholdMs" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterprisePerformanceCertificationResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PerfCertRun_created_idx"
ON "EnterprisePerformanceCertificationRun"("tenantId", "createdAt");

CREATE INDEX "PerfCertRun_status_idx"
ON "EnterprisePerformanceCertificationRun"("tenantId", "status");

CREATE UNIQUE INDEX "PerfCertResult_run_key"
ON "EnterprisePerformanceCertificationResult"("certificationRunId", "scenarioKey");

CREATE INDEX "PerfCertResult_run_idx"
ON "EnterprisePerformanceCertificationResult"("tenantId", "certificationRunId");

CREATE INDEX "PerfCertResult_status_idx"
ON "EnterprisePerformanceCertificationResult"("tenantId", "status", "category");
