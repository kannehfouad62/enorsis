CREATE TABLE "AutonomousNativeWorkflowDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adapterJobId" TEXT NOT NULL,
    "executionHandoffId" TEXT NOT NULL,
    "targetWorkflow" TEXT NOT NULL,
    "nativeReferenceType" TEXT NOT NULL,
    "nativeRoute" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT_MATERIALIZED',
    "draftTitle" TEXT NOT NULL,
    "draftPayload" JSONB NOT NULL,
    "validationSnapshot" JSONB NOT NULL,
    "requiresNativeReview" BOOLEAN NOT NULL DEFAULT true,
    "openedByUserId" TEXT,
    "openedAt" TIMESTAMP(3),
    "nativeReferenceId" TEXT,
    "nativeReferenceUrl" TEXT,
    "completedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutonomousNativeWorkflowDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomousNativeWorkflowDraftDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nativeDraftId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomousNativeWorkflowDraftDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoNativeDraft_adapter_key"
ON "AutonomousNativeWorkflowDraft"("tenantId", "adapterJobId");

CREATE INDEX "AutoNativeDraft_status_idx"
ON "AutonomousNativeWorkflowDraft"("tenantId", "status");

CREATE INDEX "AutoNativeDraft_workflow_idx"
ON "AutonomousNativeWorkflowDraft"("tenantId", "targetWorkflow");

CREATE INDEX "AutoNativeDecision_draft_idx"
ON "AutonomousNativeWorkflowDraftDecision"("tenantId", "nativeDraftId", "createdAt");

CREATE INDEX "AutoNativeDecision_type_idx"
ON "AutonomousNativeWorkflowDraftDecision"("tenantId", "decision");
