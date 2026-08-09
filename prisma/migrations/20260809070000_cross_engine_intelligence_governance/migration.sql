CREATE TABLE "CrossEngineGovernanceAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdByUserId" TEXT,
    "procurementRunId" TEXT,
    "inventoryRunId" TEXT,
    "capacityRunId" TEXT,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "alignmentScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "summary" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrossEngineGovernanceAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrossEngineGovernanceConflict" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "precedenceRule" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "acknowledgedByUserId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrossEngineGovernanceConflict_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrossGovAssess_generated_idx"
ON "CrossEngineGovernanceAssessment"("tenantId", "generatedAt");

CREATE INDEX "CrossGovAssess_status_idx"
ON "CrossEngineGovernanceAssessment"("tenantId", "status");

CREATE INDEX "CrossGovConflict_assess_idx"
ON "CrossEngineGovernanceConflict"("tenantId", "assessmentId");

CREATE INDEX "CrossGovConflict_status_idx"
ON "CrossEngineGovernanceConflict"("tenantId", "status", "severity");

CREATE INDEX "CrossGovConflict_type_idx"
ON "CrossEngineGovernanceConflict"("tenantId", "conflictType");
