CREATE TABLE "AutonomousProcurementRecommendationSet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "sourcePlanId" TEXT,
    "title" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL DEFAULT 90,
    "modelVersion" TEXT NOT NULL DEFAULT 'ENORSIS_AUTONOMOUS_RECOMMEND_V1',
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "overallRiskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "estimatedSavingsUsd" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "estimatedExposureUsd" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "sourceSnapshot" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "aiExecutionId" TEXT,
    "aiNarrative" TEXT,
    "aiError" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousProcurementRecommendationSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousProcurementRecommendation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recommendationSetId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "estimatedSavingsUsd" DECIMAL(20,4),
    "estimatedExposureUsd" DECIMAL(20,4),
    "confidence" DECIMAL(6,2) NOT NULL DEFAULT 50,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "resourceLabel" TEXT,
    "evidence" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "disposition" TEXT,
    "dispositionReason" TEXT,
    "dispositionedByUserId" TEXT,
    "dispositionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousProcurementRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousProcurementRecommendationDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomousProcurementRecommendationDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutoRecSet_tenant_created_idx"
ON "AutonomousProcurementRecommendationSet"("tenantId", "createdAt");

CREATE INDEX "AutoRecSet_tenant_status_idx"
ON "AutonomousProcurementRecommendationSet"("tenantId", "status");

CREATE INDEX "AutoRecSet_source_plan_idx"
ON "AutonomousProcurementRecommendationSet"("tenantId", "sourcePlanId");

CREATE UNIQUE INDEX "AutoRec_set_seq_key"
ON "AutonomousProcurementRecommendation"("recommendationSetId", "sequence");

CREATE INDEX "AutoRec_set_priority_idx"
ON "AutonomousProcurementRecommendation"("tenantId", "recommendationSetId", "priority");

CREATE INDEX "AutoRec_type_idx"
ON "AutonomousProcurementRecommendation"("tenantId", "recommendationType");

CREATE INDEX "AutoRec_status_idx"
ON "AutonomousProcurementRecommendation"("tenantId", "status");

CREATE INDEX "AutoRecDecision_rec_idx"
ON "AutonomousProcurementRecommendationDecision"("tenantId", "recommendationId", "createdAt");

CREATE INDEX "AutoRecDecision_type_idx"
ON "AutonomousProcurementRecommendationDecision"("tenantId", "decision");
