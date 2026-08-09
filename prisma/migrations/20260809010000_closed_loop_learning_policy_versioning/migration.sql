CREATE TABLE "ClosedLoopLearningPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CANDIDATE',
    "currentValue" DOUBLE PRECISION,
    "proposedValue" DOUBLE PRECISION,
    "effectiveValue" DOUBLE PRECISION,
    "configuration" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "deactivatedByUserId" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "supersedesPolicyId" TEXT,
    "rollbackOfPolicyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClosedLoopLearningPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClosedLoopLearningPolicyEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "message" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClosedLoopLearningPolicyEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearnPolicy_key_ver_key"
ON "ClosedLoopLearningPolicy"("tenantId", "policyKey", "version");

CREATE INDEX "LearnPolicy_key_status_idx"
ON "ClosedLoopLearningPolicy"("tenantId", "policyKey", "status");

CREATE INDEX "LearnPolicy_proposal_idx"
ON "ClosedLoopLearningPolicy"("tenantId", "proposalId");

CREATE INDEX "LearnPolicyEvent_policy_idx"
ON "ClosedLoopLearningPolicyEvent"("tenantId", "policyId", "createdAt");

CREATE INDEX "LearnPolicyEvent_type_idx"
ON "ClosedLoopLearningPolicyEvent"("tenantId", "eventType");
