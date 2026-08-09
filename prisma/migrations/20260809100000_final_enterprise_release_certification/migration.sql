CREATE TABLE "FinalEnterpriseReleaseCertificationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "releaseKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "triggeredByUserId" TEXT,
    "readinessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGates" INTEGER NOT NULL DEFAULT 0,
    "passedGates" INTEGER NOT NULL DEFAULT 0,
    "warningGates" INTEGER NOT NULL DEFAULT 0,
    "failedGates" INTEGER NOT NULL DEFAULT 0,
    "decision" TEXT NOT NULL DEFAULT 'HOLD',
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinalEnterpriseReleaseCertificationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinalEnterpriseReleaseCertificationGate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "certificationRunId" TEXT NOT NULL,
    "gateKey" TEXT NOT NULL,
    "gateLabel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "message" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalEnterpriseReleaseCertificationGate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinalReleaseCert_created_idx"
ON "FinalEnterpriseReleaseCertificationRun"("tenantId", "createdAt");

CREATE INDEX "FinalReleaseCert_status_idx"
ON "FinalEnterpriseReleaseCertificationRun"("tenantId", "status");

CREATE UNIQUE INDEX "FinalReleaseGate_run_key"
ON "FinalEnterpriseReleaseCertificationGate"("certificationRunId", "gateKey");

CREATE INDEX "FinalReleaseGate_run_idx"
ON "FinalEnterpriseReleaseCertificationGate"("tenantId", "certificationRunId");

CREATE INDEX "FinalReleaseGate_status_idx"
ON "FinalEnterpriseReleaseCertificationGate"("tenantId", "status", "category");
