CREATE TABLE "EndToEndCommerceCertificationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "triggeredByUserId" TEXT,
    "certificationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalChecks" INTEGER NOT NULL DEFAULT 0,
    "passedChecks" INTEGER NOT NULL DEFAULT 0,
    "warningChecks" INTEGER NOT NULL DEFAULT 0,
    "failedChecks" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EndToEndCommerceCertificationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EndToEndCommerceCertificationCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "certificationRunId" TEXT NOT NULL,
    "checkKey" TEXT NOT NULL,
    "checkLabel" TEXT NOT NULL,
    "lifecycleStage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "message" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EndToEndCommerceCertificationCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "E2ECommerceCert_created_idx"
ON "EndToEndCommerceCertificationRun"("tenantId", "createdAt");

CREATE INDEX "E2ECommerceCert_status_idx"
ON "EndToEndCommerceCertificationRun"("tenantId", "status");

CREATE UNIQUE INDEX "E2ECommerceCheck_run_key"
ON "EndToEndCommerceCertificationCheck"("certificationRunId", "checkKey");

CREATE INDEX "E2ECommerceCheck_run_idx"
ON "EndToEndCommerceCertificationCheck"("tenantId", "certificationRunId");

CREATE INDEX "E2ECommerceCheck_status_idx"
ON "EndToEndCommerceCertificationCheck"("tenantId", "status", "lifecycleStage");
