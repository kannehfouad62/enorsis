-- CreateEnum
CREATE TYPE "SupplierScorecardStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "SupplierPerformanceRating" AS ENUM ('EXCEPTIONAL', 'STRONG', 'ACCEPTABLE', 'NEEDS_IMPROVEMENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SupplierKpiCategory" AS ENUM ('DELIVERY', 'QUALITY', 'COST', 'SERVICE', 'INNOVATION', 'ESG', 'RISK', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "SupplierDevelopmentPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierCorrectiveActionStatus" AS ENUM ('OPEN', 'SUPPLIER_RESPONSE_REQUIRED', 'UNDER_REVIEW', 'IMPLEMENTATION', 'VERIFICATION', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierCorrectiveActionSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "SupplierScorecard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "SupplierScorecardStatus" NOT NULL DEFAULT 'DRAFT',
    "rating" "SupplierPerformanceRating" NOT NULL,
    "overallScore" DECIMAL(8,2) NOT NULL,
    "deliveryScore" DECIMAL(8,2) NOT NULL,
    "qualityScore" DECIMAL(8,2) NOT NULL,
    "costScore" DECIMAL(8,2) NOT NULL,
    "serviceScore" DECIMAL(8,2) NOT NULL,
    "innovationScore" DECIMAL(8,2) NOT NULL,
    "esgScore" DECIMAL(8,2) NOT NULL,
    "riskScore" DECIMAL(8,2) NOT NULL,
    "complianceScore" DECIMAL(8,2) NOT NULL,
    "executiveSummary" TEXT,
    "strengths" TEXT,
    "concerns" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "publishedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierKpiResult" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "category" "SupplierKpiCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DECIMAL(18,4),
    "actualValue" DECIMAL(18,4),
    "unit" TEXT,
    "weight" DECIMAL(8,2) NOT NULL,
    "score" DECIMAL(8,2) NOT NULL,
    "dataSource" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierKpiResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDevelopmentPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" "SupplierDevelopmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerUserId" TEXT NOT NULL,
    "supplierOwnerName" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "targetCompletionAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "successMeasures" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "reviewCadence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDevelopmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCorrectiveAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "scarNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "SupplierCorrectiveActionSeverity" NOT NULL,
    "status" "SupplierCorrectiveActionStatus" NOT NULL DEFAULT 'OPEN',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "supplierContactName" TEXT,
    "supplierContactEmail" TEXT,
    "containmentAction" TEXT,
    "rootCause" TEXT,
    "correctiveActionPlan" TEXT,
    "preventiveAction" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "supplierRespondedAt" TIMESTAMP(3),
    "implementationAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierScorecard_tenantId_status_periodEnd_idx" ON "SupplierScorecard"("tenantId", "status", "periodEnd");

-- CreateIndex
CREATE INDEX "SupplierScorecard_supplierId_periodEnd_idx" ON "SupplierScorecard"("supplierId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierScorecard_supplierId_periodStart_periodEnd_key" ON "SupplierScorecard"("supplierId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "SupplierKpiResult_scorecardId_category_idx" ON "SupplierKpiResult"("scorecardId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierKpiResult_scorecardId_key_key" ON "SupplierKpiResult"("scorecardId", "key");

-- CreateIndex
CREATE INDEX "SupplierDevelopmentPlan_tenantId_status_targetCompletionAt_idx" ON "SupplierDevelopmentPlan"("tenantId", "status", "targetCompletionAt");

-- CreateIndex
CREATE INDEX "SupplierDevelopmentPlan_supplierId_status_idx" ON "SupplierDevelopmentPlan"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierCorrectiveAction_tenantId_status_dueAt_idx" ON "SupplierCorrectiveAction"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "SupplierCorrectiveAction_supplierId_status_idx" ON "SupplierCorrectiveAction"("supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCorrectiveAction_tenantId_scarNumber_key" ON "SupplierCorrectiveAction"("tenantId", "scarNumber");

-- AddForeignKey
ALTER TABLE "SupplierScorecard" ADD CONSTRAINT "SupplierScorecard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierScorecard" ADD CONSTRAINT "SupplierScorecard_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierKpiResult" ADD CONSTRAINT "SupplierKpiResult_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "SupplierScorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDevelopmentPlan" ADD CONSTRAINT "SupplierDevelopmentPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDevelopmentPlan" ADD CONSTRAINT "SupplierDevelopmentPlan_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCorrectiveAction" ADD CONSTRAINT "SupplierCorrectiveAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCorrectiveAction" ADD CONSTRAINT "SupplierCorrectiveAction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
