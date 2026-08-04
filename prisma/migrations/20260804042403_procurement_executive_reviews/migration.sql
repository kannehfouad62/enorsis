-- CreateEnum
CREATE TYPE "ProcurementReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcurementReviewType" AS ENUM ('WEEKLY_OPERATING_REVIEW', 'MONTHLY_BUSINESS_REVIEW', 'QUARTERLY_BUSINESS_REVIEW', 'EXECUTIVE_COMMITTEE', 'BOARD_PACK');

-- CreateEnum
CREATE TYPE "ProcurementReviewActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcurementReviewMetricStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'NOT_AVAILABLE');

-- CreateTable
CREATE TABLE "ProcurementReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ProcurementReviewType" NOT NULL,
    "status" "ProcurementReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "meetingAt" TIMESTAMP(3) NOT NULL,
    "preparedByUserId" TEXT NOT NULL,
    "chairUserId" TEXT,
    "executiveSummary" TEXT,
    "accomplishments" TEXT,
    "decisionsRequired" TEXT,
    "keyRisks" TEXT,
    "nextPeriodPriorities" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementReviewMetric" (
    "id" TEXT NOT NULL,
    "procurementReviewId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL(18,4),
    "target" DECIMAL(18,4),
    "unit" TEXT,
    "status" "ProcurementReviewMetricStatus" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "commentary" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementReviewMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementReviewAction" (
    "id" TEXT NOT NULL,
    "procurementReviewId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "ProcurementReviewActionStatus" NOT NULL DEFAULT 'OPEN',
    "blocker" TEXT,
    "completionEvidence" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementReview_tenantId_status_meetingAt_idx" ON "ProcurementReview"("tenantId", "status", "meetingAt");

-- CreateIndex
CREATE INDEX "ProcurementReview_tenantId_type_periodEnd_idx" ON "ProcurementReview"("tenantId", "type", "periodEnd");

-- CreateIndex
CREATE INDEX "ProcurementReviewMetric_procurementReviewId_category_status_idx" ON "ProcurementReviewMetric"("procurementReviewId", "category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementReviewMetric_procurementReviewId_key_key" ON "ProcurementReviewMetric"("procurementReviewId", "key");

-- CreateIndex
CREATE INDEX "ProcurementReviewAction_procurementReviewId_status_dueAt_idx" ON "ProcurementReviewAction"("procurementReviewId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ProcurementReviewAction_ownerUserId_status_dueAt_idx" ON "ProcurementReviewAction"("ownerUserId", "status", "dueAt");

-- AddForeignKey
ALTER TABLE "ProcurementReview" ADD CONSTRAINT "ProcurementReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementReviewMetric" ADD CONSTRAINT "ProcurementReviewMetric_procurementReviewId_fkey" FOREIGN KEY ("procurementReviewId") REFERENCES "ProcurementReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementReviewAction" ADD CONSTRAINT "ProcurementReviewAction_procurementReviewId_fkey" FOREIGN KEY ("procurementReviewId") REFERENCES "ProcurementReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
