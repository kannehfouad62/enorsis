CREATE TYPE "ReconciliationGovernanceStatus" AS ENUM (
  'OPEN',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CLOSED'
);

CREATE TYPE "ReconciliationCloseStatus" AS ENUM (
  'OPEN',
  'CLOSED'
);

CREATE TABLE "ReconciliationGovernanceCase" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "reconciliationId" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "dueAt" TIMESTAMP(3),
  "materialityAmount" DECIMAL(18,2) NOT NULL DEFAULT 1000,
  "status" "ReconciliationGovernanceStatus" NOT NULL DEFAULT 'OPEN',
  "resolutionRequest" TEXT,
  "requestedByUserId" TEXT,
  "requestedAt" TIMESTAMP(3),
  "approvalDecisionNote" TEXT,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedByUserId" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReconciliationGovernanceCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReconciliationClosePeriod" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "ReconciliationCloseStatus" NOT NULL DEFAULT 'OPEN',
  "closeNote" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "closedByUserId" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReconciliationClosePeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReconciliationGovernanceCase_reconciliationId_key"
ON "ReconciliationGovernanceCase"("reconciliationId");

CREATE INDEX "ReconciliationGovernanceCase_tenantId_status_dueAt_idx"
ON "ReconciliationGovernanceCase"("tenantId", "status", "dueAt");

CREATE INDEX "ReconciliationGovernanceCase_ownerUserId_status_dueAt_idx"
ON "ReconciliationGovernanceCase"("ownerUserId", "status", "dueAt");

CREATE UNIQUE INDEX "ReconciliationClosePeriod_tenantId_periodStart_periodEnd_key"
ON "ReconciliationClosePeriod"("tenantId", "periodStart", "periodEnd");

CREATE INDEX "ReconciliationClosePeriod_tenantId_status_periodEnd_idx"
ON "ReconciliationClosePeriod"("tenantId", "status", "periodEnd");
