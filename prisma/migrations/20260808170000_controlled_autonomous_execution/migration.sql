CREATE TABLE "AutonomousExecutionEnvelope" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "executionType" TEXT NOT NULL,
    "targetWorkflow" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_POLICY_REVIEW',
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "proposedValueUsd" DECIMAL(20,4),
    "proposedQuantity" DECIMAL(20,4),
    "proposedSupplierId" TEXT,
    "executionPayload" JSONB NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "readinessSummary" JSONB NOT NULL,
    "requiresHumanRelease" BOOLEAN NOT NULL DEFAULT true,
    "releasedByUserId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "handoffStatus" TEXT NOT NULL DEFAULT 'NOT_RELEASED',
    "handoffReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousExecutionEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousExecutionPolicyCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionEnvelopeId" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "policyLabel" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomousExecutionPolicyCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousExecutionDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionEnvelopeId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomousExecutionDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousExecutionHandoff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionEnvelopeId" TEXT NOT NULL,
    "targetWorkflow" TEXT NOT NULL,
    "handoffMode" TEXT NOT NULL DEFAULT 'CONTROLLED',
    "status" TEXT NOT NULL DEFAULT 'READY_FOR_HANDOFF',
    "payload" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousExecutionHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoExec_source_key"
ON "AutonomousExecutionEnvelope"("tenantId", "sourceType", "sourceId");

CREATE INDEX "AutoExec_tenant_status_idx"
ON "AutonomousExecutionEnvelope"("tenantId", "status");

CREATE INDEX "AutoExec_tenant_created_idx"
ON "AutonomousExecutionEnvelope"("tenantId", "createdAt");

CREATE INDEX "AutoExec_type_idx"
ON "AutonomousExecutionEnvelope"("tenantId", "executionType");

CREATE UNIQUE INDEX "AutoExecPolicy_env_key"
ON "AutonomousExecutionPolicyCheck"("executionEnvelopeId", "policyKey");

CREATE INDEX "AutoExecPolicy_env_idx"
ON "AutonomousExecutionPolicyCheck"("tenantId", "executionEnvelopeId");

CREATE INDEX "AutoExecPolicy_result_idx"
ON "AutonomousExecutionPolicyCheck"("tenantId", "result");

CREATE INDEX "AutoExecDecision_env_idx"
ON "AutonomousExecutionDecision"("tenantId", "executionEnvelopeId", "createdAt");

CREATE INDEX "AutoExecDecision_type_idx"
ON "AutonomousExecutionDecision"("tenantId", "decision");

CREATE INDEX "AutoExecHandoff_status_idx"
ON "AutonomousExecutionHandoff"("tenantId", "status");

CREATE INDEX "AutoExecHandoff_env_idx"
ON "AutonomousExecutionHandoff"("tenantId", "executionEnvelopeId");
