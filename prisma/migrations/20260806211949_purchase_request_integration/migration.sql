-- CreateEnum
CREATE TYPE "RequisitionSubmissionAssessmentStatus" AS ENUM ('DRAFT', 'READY', 'BLOCKED', 'SUBMITTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RequisitionSubmissionCheckStatus" AS ENUM ('PASS', 'WARN', 'FAIL', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "RequisitionSubmissionAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "status" "RequisitionSubmissionAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "requestTitle" TEXT,
    "requestNumber" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "declaredLineCount" INTEGER NOT NULL DEFAULT 0,
    "declaredTotalAmount" DECIMAL(18,2),
    "businessJustification" TEXT,
    "budgetReference" TEXT,
    "costCenterReference" TEXT,
    "requiredByDate" TIMESTAMP(3),
    "supplierRequired" BOOLEAN NOT NULL DEFAULT false,
    "supplierId" TEXT,
    "validationSummary" JSONB,
    "assessedByUserId" TEXT,
    "assessedAt" TIMESTAMP(3),
    "submittedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionSubmissionAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionSubmissionCheck" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RequisitionSubmissionCheckStatus" NOT NULL,
    "releaseBlocking" BOOLEAN NOT NULL DEFAULT false,
    "observedValue" TEXT,
    "expectedValue" TEXT,
    "remediation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionSubmissionCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequisitionSubmissionAssessment_tenantId_status_createdAt_idx" ON "RequisitionSubmissionAssessment"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RequisitionSubmissionAssessment_purchaseRequestId_idx" ON "RequisitionSubmissionAssessment"("purchaseRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "RequisitionSubmissionAssessment_journeyId_purchaseRequestId_key" ON "RequisitionSubmissionAssessment"("journeyId", "purchaseRequestId");

-- CreateIndex
CREATE INDEX "RequisitionSubmissionCheck_status_releaseBlocking_idx" ON "RequisitionSubmissionCheck"("status", "releaseBlocking");

-- CreateIndex
CREATE UNIQUE INDEX "RequisitionSubmissionCheck_assessmentId_key_key" ON "RequisitionSubmissionCheck"("assessmentId", "key");

-- AddForeignKey
ALTER TABLE "RequisitionSubmissionAssessment" ADD CONSTRAINT "RequisitionSubmissionAssessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionSubmissionAssessment" ADD CONSTRAINT "RequisitionSubmissionAssessment_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "RequisitionOrderJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionSubmissionCheck" ADD CONSTRAINT "RequisitionSubmissionCheck_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "RequisitionSubmissionAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
