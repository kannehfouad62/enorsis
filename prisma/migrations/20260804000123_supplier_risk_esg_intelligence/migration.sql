-- CreateEnum
CREATE TYPE "SupplierRiskAssessmentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierRiskFindingStatus" AS ENUM ('OPEN', 'MITIGATING', 'RESOLVED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "SupplierRiskFindingType" AS ENUM ('FINANCIAL', 'OPERATIONAL', 'COMPLIANCE', 'SANCTIONS', 'CYBER', 'ESG', 'DELIVERY', 'QUALITY', 'CONCENTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierEsgRating" AS ENUM ('LEADING', 'ACCEPTABLE', 'NEEDS_IMPROVEMENT', 'HIGH_RISK', 'NOT_ASSESSED');

-- CreateTable
CREATE TABLE "SupplierRiskAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "SupplierRiskAssessmentStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "financialRisk" INTEGER NOT NULL,
    "operationalRisk" INTEGER NOT NULL,
    "complianceRisk" INTEGER NOT NULL,
    "cyberRisk" INTEGER NOT NULL,
    "esgRisk" INTEGER NOT NULL,
    "deliveryRisk" INTEGER NOT NULL,
    "qualityRisk" INTEGER NOT NULL,
    "concentrationRisk" INTEGER NOT NULL,
    "inherentRiskScore" INTEGER NOT NULL,
    "residualRiskScore" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "controls" TEXT,
    "reviewedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierRiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierRiskFinding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" "SupplierRiskFindingType" NOT NULL,
    "status" "SupplierRiskFindingStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "ownerUserId" TEXT,
    "mitigationPlan" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierRiskFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEsgAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "environmentalScore" INTEGER NOT NULL,
    "socialScore" INTEGER NOT NULL,
    "governanceScore" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "rating" "SupplierEsgRating" NOT NULL DEFAULT 'NOT_ASSESSED',
    "carbonDisclosure" BOOLEAN NOT NULL DEFAULT false,
    "scienceBasedTargets" BOOLEAN NOT NULL DEFAULT false,
    "modernSlaveryPolicy" BOOLEAN NOT NULL DEFAULT false,
    "diversityProgram" BOOLEAN NOT NULL DEFAULT false,
    "ethicsPolicy" BOOLEAN NOT NULL DEFAULT false,
    "evidenceSummary" TEXT,
    "assessedByUserId" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierEsgAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierRiskAssessment_tenantId_status_createdAt_idx" ON "SupplierRiskAssessment"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierRiskAssessment_supplierId_createdAt_idx" ON "SupplierRiskAssessment"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierRiskFinding_tenantId_status_severity_idx" ON "SupplierRiskFinding"("tenantId", "status", "severity");

-- CreateIndex
CREATE INDEX "SupplierRiskFinding_supplierId_status_idx" ON "SupplierRiskFinding"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierEsgAssessment_tenantId_rating_assessedAt_idx" ON "SupplierEsgAssessment"("tenantId", "rating", "assessedAt");

-- CreateIndex
CREATE INDEX "SupplierEsgAssessment_supplierId_assessedAt_idx" ON "SupplierEsgAssessment"("supplierId", "assessedAt");

-- AddForeignKey
ALTER TABLE "SupplierRiskAssessment" ADD CONSTRAINT "SupplierRiskAssessment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRiskFinding" ADD CONSTRAINT "SupplierRiskFinding_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEsgAssessment" ADD CONSTRAINT "SupplierEsgAssessment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
