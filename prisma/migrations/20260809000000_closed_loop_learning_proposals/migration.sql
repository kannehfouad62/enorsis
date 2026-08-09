CREATE TABLE "ClosedLoopLearningProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "proposedValue" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "evidenceSnapshot" JSONB NOT NULL,
    "createdBySystem" BOOLEAN NOT NULL DEFAULT true,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClosedLoopLearningProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearnProposal_scope_status_key"
ON "ClosedLoopLearningProposal"("tenantId", "proposalType", "scopeKey", "status");

CREATE INDEX "LearnProposal_status_idx"
ON "ClosedLoopLearningProposal"("tenantId", "status", "priority");

CREATE INDEX "LearnProposal_type_idx"
ON "ClosedLoopLearningProposal"("tenantId", "proposalType");
