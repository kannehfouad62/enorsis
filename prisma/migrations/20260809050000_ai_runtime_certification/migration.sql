CREATE TABLE "AiRuntimeCertificationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "certificationKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredByUserId" TEXT,
    "totalScenarios" INTEGER NOT NULL DEFAULT 0,
    "passedScenarios" INTEGER NOT NULL DEFAULT 0,
    "warningScenarios" INTEGER NOT NULL DEFAULT 0,
    "failedScenarios" INTEGER NOT NULL DEFAULT 0,
    "certificationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiRuntimeCertificationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiRuntimeCertificationResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "certificationRunId" TEXT NOT NULL,
    "scenarioKey" TEXT NOT NULL,
    "scenarioLabel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRuntimeCertificationResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiCertRun_created_idx"
ON "AiRuntimeCertificationRun"("tenantId", "createdAt");

CREATE INDEX "AiCertRun_status_idx"
ON "AiRuntimeCertificationRun"("tenantId", "status");

CREATE UNIQUE INDEX "AiCertResult_run_scenario_key"
ON "AiRuntimeCertificationResult"("certificationRunId", "scenarioKey");

CREATE INDEX "AiCertResult_run_idx"
ON "AiRuntimeCertificationResult"("tenantId", "certificationRunId");

CREATE INDEX "AiCertResult_status_idx"
ON "AiRuntimeCertificationResult"("tenantId", "status", "category");
