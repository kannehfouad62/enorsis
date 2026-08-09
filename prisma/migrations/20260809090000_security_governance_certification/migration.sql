CREATE TABLE "SecurityGovernanceCertificationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "triggeredByUserId" TEXT,
    "totalScenarios" INTEGER NOT NULL DEFAULT 0,
    "passedScenarios" INTEGER NOT NULL DEFAULT 0,
    "warningScenarios" INTEGER NOT NULL DEFAULT 0,
    "failedScenarios" INTEGER NOT NULL DEFAULT 0,
    "certificationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecurityGovernanceCertificationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityGovernanceCertificationResult" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityGovernanceCertificationResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecGovCertRun_created_idx"
ON "SecurityGovernanceCertificationRun"("tenantId", "createdAt");

CREATE INDEX "SecGovCertRun_status_idx"
ON "SecurityGovernanceCertificationRun"("tenantId", "status");

CREATE UNIQUE INDEX "SecGovCertResult_run_key"
ON "SecurityGovernanceCertificationResult"("certificationRunId", "scenarioKey");

CREATE INDEX "SecGovCertResult_run_idx"
ON "SecurityGovernanceCertificationResult"("tenantId", "certificationRunId");

CREATE INDEX "SecGovCertResult_status_idx"
ON "SecurityGovernanceCertificationResult"("tenantId", "status", "category");
