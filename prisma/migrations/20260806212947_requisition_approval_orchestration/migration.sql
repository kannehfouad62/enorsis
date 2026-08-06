-- CreateEnum
CREATE TYPE "RequisitionApprovalRouteStatus" AS ENUM ('DRAFT', 'ACTIVE', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequisitionApprovalStepMode" AS ENUM ('SEQUENTIAL', 'PARALLEL');

-- CreateEnum
CREATE TYPE "RequisitionApprovalDecisionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELEGATED', 'SKIPPED', 'EXPIRED');

-- CreateTable
CREATE TABLE "RequisitionApprovalRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "name" TEXT NOT NULL,
    "status" "RequisitionApprovalRouteStatus" NOT NULL DEFAULT 'DRAFT',
    "currentSequence" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(18,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "initiatedByUserId" TEXT,
    "initiatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionApprovalRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionApprovalStep" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "RequisitionApprovalStepMode" NOT NULL DEFAULT 'SEQUENTIAL',
    "requiredApprovals" INTEGER NOT NULL DEFAULT 1,
    "approvalRole" TEXT,
    "approvalUserId" TEXT,
    "amountThreshold" DECIMAL(18,2),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionApprovalDecision" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "delegatedFromUserId" TEXT,
    "status" "RequisitionApprovalDecisionStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequisitionApprovalRoute_tenantId_status_createdAt_idx" ON "RequisitionApprovalRoute"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RequisitionApprovalRoute_journeyId_status_idx" ON "RequisitionApprovalRoute"("journeyId", "status");

-- CreateIndex
CREATE INDEX "RequisitionApprovalStep_routeId_sequence_idx" ON "RequisitionApprovalStep"("routeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "RequisitionApprovalStep_routeId_sequence_name_key" ON "RequisitionApprovalStep"("routeId", "sequence", "name");

-- CreateIndex
CREATE INDEX "RequisitionApprovalDecision_approverUserId_status_dueAt_idx" ON "RequisitionApprovalDecision"("approverUserId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequisitionApprovalDecision_stepId_approverUserId_key" ON "RequisitionApprovalDecision"("stepId", "approverUserId");

-- AddForeignKey
ALTER TABLE "RequisitionApprovalRoute" ADD CONSTRAINT "RequisitionApprovalRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionApprovalRoute" ADD CONSTRAINT "RequisitionApprovalRoute_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "RequisitionOrderJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionApprovalStep" ADD CONSTRAINT "RequisitionApprovalStep_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "RequisitionApprovalRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionApprovalDecision" ADD CONSTRAINT "RequisitionApprovalDecision_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "RequisitionApprovalStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
