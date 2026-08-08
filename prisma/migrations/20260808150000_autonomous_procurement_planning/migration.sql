CREATE TABLE "AutonomousProcurementPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL DEFAULT 90,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "planVersion" INTEGER NOT NULL DEFAULT 1,
    "modelVersion" TEXT NOT NULL DEFAULT 'ENORSIS_AUTONOMOUS_PLAN_V1',
    "sourceSnapshot" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "aiExecutionId" TEXT,
    "aiNarrative" TEXT,
    "aiError" TEXT,
    "overallRiskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "estimatedSpendUsd" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "estimatedSavingsUsd" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "requiresHumanApproval" BOOLEAN NOT NULL DEFAULT true,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousProcurementPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousProcurementPlanAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceLabel" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "recommendation" TEXT NOT NULL,
    "proposedQuantity" DECIMAL(20,4),
    "proposedValueUsd" DECIMAL(20,4),
    "proposedSupplierId" TEXT,
    "confidence" DECIMAL(6,2) NOT NULL DEFAULT 50,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "evidence" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousProcurementPlanAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousProcurementPlanDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "decisionReason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomousProcurementPlanDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutoPlan_tenant_created_idx"
ON "AutonomousProcurementPlan"("tenantId", "createdAt");

CREATE INDEX "AutoPlan_tenant_status_idx"
ON "AutonomousProcurementPlan"("tenantId", "status");

CREATE UNIQUE INDEX "AutoPlanAction_plan_seq_key"
ON "AutonomousProcurementPlanAction"("planId", "sequence");

CREATE INDEX "AutoPlanAction_plan_priority_idx"
ON "AutonomousProcurementPlanAction"("tenantId", "planId", "priority");

CREATE INDEX "AutoPlanAction_type_idx"
ON "AutonomousProcurementPlanAction"("tenantId", "actionType");

CREATE INDEX "AutoPlanDecision_plan_idx"
ON "AutonomousProcurementPlanDecision"("tenantId", "planId", "createdAt");

CREATE INDEX "AutoPlanDecision_type_idx"
ON "AutonomousProcurementPlanDecision"("tenantId", "decision");
