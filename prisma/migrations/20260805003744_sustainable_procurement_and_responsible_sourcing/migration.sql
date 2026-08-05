-- CreateEnum
CREATE TYPE "SupplierEsgStatus" AS ENUM ('NOT_ASSESSED', 'ASSESSMENT_DUE', 'ASSESSED', 'IMPROVEMENT_REQUIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SupplierEsgRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ResponsibleSourcingAssessmentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SustainabilityImprovementStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiversityClassification" AS ENUM ('NONE', 'MINORITY_OWNED', 'WOMEN_OWNED', 'VETERAN_OWNED', 'DISABILITY_OWNED', 'LGBTQ_OWNED', 'SMALL_BUSINESS', 'LOCAL_BUSINESS', 'SOCIAL_ENTERPRISE', 'OTHER');

-- CreateTable
CREATE TABLE "SupplierEsgProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "SupplierEsgStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "riskLevel" "SupplierEsgRiskLevel" NOT NULL DEFAULT 'MODERATE',
    "environmentalScore" DECIMAL(5,2),
    "socialScore" DECIMAL(5,2),
    "governanceScore" DECIMAL(5,2),
    "overallScore" DECIMAL(5,2),
    "scope1Emissions" DECIMAL(18,4),
    "scope2Emissions" DECIMAL(18,4),
    "scope3Emissions" DECIMAL(18,4),
    "emissionsUnit" TEXT DEFAULT 'tCO2e',
    "renewableEnergyPercent" DECIMAL(5,2),
    "wasteDiversionPercent" DECIMAL(5,2),
    "waterUse" DECIMAL(18,4),
    "humanRightsPolicy" BOOLEAN NOT NULL DEFAULT false,
    "modernSlaveryStatement" BOOLEAN NOT NULL DEFAULT false,
    "conflictMineralsDeclaration" BOOLEAN NOT NULL DEFAULT false,
    "codeOfConductAccepted" BOOLEAN NOT NULL DEFAULT false,
    "diversityClassification" "DiversityClassification" NOT NULL DEFAULT 'NONE',
    "diversityCertificationId" TEXT,
    "certificationExpiresAt" TIMESTAMP(3),
    "lastAssessedAt" TIMESTAMP(3),
    "nextAssessmentDueAt" TIMESTAMP(3),
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierEsgProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsibleSourcingAssessment" (
    "id" TEXT NOT NULL,
    "supplierEsgProfileId" TEXT NOT NULL,
    "assessmentPeriod" TEXT NOT NULL,
    "status" "ResponsibleSourcingAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "environmentalScore" DECIMAL(5,2),
    "socialScore" DECIMAL(5,2),
    "governanceScore" DECIMAL(5,2),
    "findings" TEXT,
    "evidence" JSONB,
    "assessedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsibleSourcingAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SustainabilityImprovementPlan" (
    "id" TEXT NOT NULL,
    "supplierEsgProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SustainabilityImprovementStatus" NOT NULL DEFAULT 'OPEN',
    "category" TEXT NOT NULL,
    "targetMetric" TEXT,
    "baselineValue" DECIMAL(18,4),
    "targetValue" DECIMAL(18,4),
    "dueAt" TIMESTAMP(3) NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "supplierOwnerName" TEXT,
    "blocker" TEXT,
    "completionEvidence" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SustainabilityImprovementPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierEsgProfile_supplierId_key" ON "SupplierEsgProfile"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierEsgProfile_tenantId_status_riskLevel_idx" ON "SupplierEsgProfile"("tenantId", "status", "riskLevel");

-- CreateIndex
CREATE INDEX "SupplierEsgProfile_diversityClassification_idx" ON "SupplierEsgProfile"("diversityClassification");

-- CreateIndex
CREATE INDEX "ResponsibleSourcingAssessment_status_expiresAt_idx" ON "ResponsibleSourcingAssessment"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResponsibleSourcingAssessment_supplierEsgProfileId_assessme_key" ON "ResponsibleSourcingAssessment"("supplierEsgProfileId", "assessmentPeriod");

-- CreateIndex
CREATE INDEX "SustainabilityImprovementPlan_supplierEsgProfileId_status_d_idx" ON "SustainabilityImprovementPlan"("supplierEsgProfileId", "status", "dueAt");

-- AddForeignKey
ALTER TABLE "SupplierEsgProfile" ADD CONSTRAINT "SupplierEsgProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEsgProfile" ADD CONSTRAINT "SupplierEsgProfile_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsibleSourcingAssessment" ADD CONSTRAINT "ResponsibleSourcingAssessment_supplierEsgProfileId_fkey" FOREIGN KEY ("supplierEsgProfileId") REFERENCES "SupplierEsgProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SustainabilityImprovementPlan" ADD CONSTRAINT "SustainabilityImprovementPlan_supplierEsgProfileId_fkey" FOREIGN KEY ("supplierEsgProfileId") REFERENCES "SupplierEsgProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
