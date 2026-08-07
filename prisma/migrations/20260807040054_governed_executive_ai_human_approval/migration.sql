-- CreateEnum
CREATE TYPE "GovernedExecutiveApprovalStatus" AS ENUM ('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'ESCALATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GovernedExecutiveApprovalDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'ESCALATE');

-- CreateTable
CREATE TABLE "GovernedExecutiveInsightApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "status" "GovernedExecutiveApprovalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "assignedReviewerUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "escalationReason" TEXT,
    "currentDecisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernedExecutiveInsightApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernedExecutiveInsightApprovalDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "decision" "GovernedExecutiveApprovalDecision" NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernedExecutiveInsightApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernedExecutiveInsightApprovalAuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernedExecutiveInsightApprovalAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GovernedExecutiveInsightApproval_insightId_key" ON "GovernedExecutiveInsightApproval"("insightId");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightApproval_tenantId_status_dueAt_idx" ON "GovernedExecutiveInsightApproval"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightApproval_assignedReviewerUserId_sta_idx" ON "GovernedExecutiveInsightApproval"("assignedReviewerUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GovernedExecutiveInsightApproval_tenantId_insightId_key" ON "GovernedExecutiveInsightApproval"("tenantId", "insightId");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightApprovalDecision_tenantId_decidedAt_idx" ON "GovernedExecutiveInsightApprovalDecision"("tenantId", "decidedAt");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightApprovalDecision_approvalId_decided_idx" ON "GovernedExecutiveInsightApprovalDecision"("approvalId", "decidedAt");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightApprovalDecision_decidedByUserId_idx" ON "GovernedExecutiveInsightApprovalDecision"("decidedByUserId");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightApprovalAuditEvent_tenantId_created_idx" ON "GovernedExecutiveInsightApprovalAuditEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightApprovalAuditEvent_approvalId_creat_idx" ON "GovernedExecutiveInsightApprovalAuditEvent"("approvalId", "createdAt");

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightApproval" ADD CONSTRAINT "GovernedExecutiveInsightApproval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightApproval" ADD CONSTRAINT "GovernedExecutiveInsightApproval_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "GovernedExecutiveInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightApprovalDecision" ADD CONSTRAINT "GovernedExecutiveInsightApprovalDecision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightApprovalDecision" ADD CONSTRAINT "GovernedExecutiveInsightApprovalDecision_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "GovernedExecutiveInsightApproval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightApprovalAuditEvent" ADD CONSTRAINT "GovernedExecutiveInsightApprovalAuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightApprovalAuditEvent" ADD CONSTRAINT "GovernedExecutiveInsightApprovalAuditEvent_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "GovernedExecutiveInsightApproval"("id") ON DELETE CASCADE ON UPDATE CASCADE;
