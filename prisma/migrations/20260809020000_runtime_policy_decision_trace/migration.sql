CREATE TABLE "ClosedLoopRuntimePolicyDecisionTrace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "policyId" TEXT,
    "proposalId" TEXT,
    "policyVersion" INTEGER,
    "policySource" TEXT NOT NULL,
    "requestedDefault" DOUBLE PRECISION NOT NULL,
    "effectiveValue" DOUBLE PRECISION NOT NULL,
    "boundedValue" DOUBLE PRECISION NOT NULL,
    "wasClamped" BOOLEAN NOT NULL DEFAULT false,
    "inputValue" DOUBLE PRECISION,
    "decisionResult" BOOLEAN,
    "rationale" TEXT,
    "evidence" JSONB NOT NULL,
    "actorUserId" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClosedLoopRuntimePolicyDecisionTrace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RuntimeTrace_created_idx"
ON "ClosedLoopRuntimePolicyDecisionTrace"("tenantId", "createdAt");

CREATE INDEX "RuntimeTrace_type_idx"
ON "ClosedLoopRuntimePolicyDecisionTrace"("tenantId", "decisionType", "createdAt");

CREATE INDEX "RuntimeTrace_policy_idx"
ON "ClosedLoopRuntimePolicyDecisionTrace"("tenantId", "policyKey", "createdAt");

CREATE INDEX "RuntimeTrace_source_idx"
ON "ClosedLoopRuntimePolicyDecisionTrace"("tenantId", "policySource");
