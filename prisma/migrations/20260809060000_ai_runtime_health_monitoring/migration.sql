CREATE TABLE "AiRuntimeHealthSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "healthScore" DOUBLE PRECISION NOT NULL,
    "decisionCount" INTEGER NOT NULL DEFAULT 0,
    "activePolicyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fallbackRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deniedRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clampedRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "traceIntegrityRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "activePolicyCount" INTEGER NOT NULL DEFAULT 0,
    "advisoryPolicyCount" INTEGER NOT NULL DEFAULT 0,
    "certificationStatus" TEXT,
    "certificationScore" DOUBLE PRECISION,
    "adoptionMode" TEXT,
    "anomalyCount" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "anomalies" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRuntimeHealthSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiHealth_captured_idx"
ON "AiRuntimeHealthSnapshot"("tenantId", "capturedAt");

CREATE INDEX "AiHealth_status_idx"
ON "AiRuntimeHealthSnapshot"("tenantId", "status");
