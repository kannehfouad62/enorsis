CREATE TABLE "ClosedLoopRuntimePromotionAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adoptionId" TEXT NOT NULL,
    "decisionPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentMode" TEXT NOT NULL,
    "recommendedMode" TEXT NOT NULL,
    "readinessScore" DOUBLE PRECISION NOT NULL,
    "minimumDecisionCount" INTEGER NOT NULL,
    "observedDecisionCount" INTEGER NOT NULL,
    "maximumDivergenceRate" DOUBLE PRECISION NOT NULL,
    "observedDivergenceRate" DOUBLE PRECISION NOT NULL,
    "fallbackRate" DOUBLE PRECISION NOT NULL,
    "clampedDecisionCount" INTEGER NOT NULL,
    "deniedDecisionCount" INTEGER NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "blockers" JSONB NOT NULL,
    "evidenceSnapshot" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "promotedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClosedLoopRuntimePromotionAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClosedLoopRuntimeRollbackRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adoptionId" TEXT NOT NULL,
    "decisionPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "maximumDivergenceRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "maximumFallbackRate" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "maximumDeniedRate" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "minimumDecisionCount" INTEGER NOT NULL DEFAULT 20,
    "autoRollbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClosedLoopRuntimeRollbackRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RuntimePromote_adopt_idx"
ON "ClosedLoopRuntimePromotionAssessment"("tenantId", "adoptionId", "createdAt");

CREATE INDEX "RuntimePromote_status_idx"
ON "ClosedLoopRuntimePromotionAssessment"("tenantId", "status", "eligible");

CREATE UNIQUE INDEX "RuntimeRollback_adopt_key"
ON "ClosedLoopRuntimeRollbackRule"("tenantId", "adoptionId");

CREATE INDEX "RuntimeRollback_status_idx"
ON "ClosedLoopRuntimeRollbackRule"("tenantId", "status");
