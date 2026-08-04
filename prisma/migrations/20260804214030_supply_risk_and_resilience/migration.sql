-- CreateEnum
CREATE TYPE "SupplyRiskEventStatus" AS ENUM ('OPEN', 'MONITORING', 'CONTAINED', 'RECOVERING', 'CLOSED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SupplyRiskEventType" AS ENUM ('SUPPLIER_FAILURE', 'LOGISTICS_DISRUPTION', 'GEOPOLITICAL', 'CYBER', 'QUALITY', 'FINANCIAL', 'NATURAL_HAZARD', 'REGULATORY', 'LABOR', 'CAPACITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplyRiskSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SupplyExposureType" AS ENUM ('SUPPLIER', 'CATEGORY', 'COUNTRY', 'SITE', 'CONTRACT', 'PURCHASE_ORDER');

-- CreateEnum
CREATE TYPE "ResiliencePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'TESTED', 'ACTIVATED', 'COMPLETED', 'RETIRED');

-- CreateTable
CREATE TABLE "SupplyRiskEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SupplyRiskEventType" NOT NULL,
    "severity" "SupplyRiskSeverity" NOT NULL,
    "status" "SupplyRiskEventStatus" NOT NULL DEFAULT 'OPEN',
    "countryCode" TEXT,
    "region" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "expectedResolutionAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "probabilityPercent" INTEGER NOT NULL DEFAULT 50,
    "financialImpact" DECIMAL(18,2),
    "operationalImpact" INTEGER NOT NULL DEFAULT 3,
    "overallRiskScore" DECIMAL(10,2) NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "executiveSummary" TEXT,
    "containmentSummary" TEXT,
    "recoverySummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyRiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyRiskExposure" (
    "id" TEXT NOT NULL,
    "supplyRiskEventId" TEXT NOT NULL,
    "type" "SupplyExposureType" NOT NULL,
    "referenceId" TEXT,
    "referenceLabel" TEXT NOT NULL,
    "criticality" INTEGER NOT NULL DEFAULT 3,
    "spendAtRisk" DECIMAL(18,2),
    "daysOfSupply" INTEGER,
    "alternateSourceCount" INTEGER NOT NULL DEFAULT 0,
    "dependencyPercent" INTEGER NOT NULL DEFAULT 0,
    "impactSummary" TEXT,
    "mitigationSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyRiskExposure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResiliencePlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplyRiskEventId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ResiliencePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerUserId" TEXT NOT NULL,
    "activationCriteria" TEXT NOT NULL,
    "recoveryObjective" TEXT NOT NULL,
    "recoveryTimeHours" INTEGER,
    "minimumServicePercent" INTEGER NOT NULL DEFAULT 50,
    "alternateSuppliers" TEXT[],
    "alternateSites" TEXT[],
    "inventoryStrategy" TEXT,
    "logisticsStrategy" TEXT,
    "communicationsPlan" TEXT,
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResiliencePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplyRiskEvent_tenantId_status_severity_detectedAt_idx" ON "SupplyRiskEvent"("tenantId", "status", "severity", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyRiskEvent_tenantId_eventNumber_key" ON "SupplyRiskEvent"("tenantId", "eventNumber");

-- CreateIndex
CREATE INDEX "SupplyRiskExposure_supplyRiskEventId_type_criticality_idx" ON "SupplyRiskExposure"("supplyRiskEventId", "type", "criticality");

-- CreateIndex
CREATE INDEX "ResiliencePlan_tenantId_status_createdAt_idx" ON "ResiliencePlan"("tenantId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "SupplyRiskEvent" ADD CONSTRAINT "SupplyRiskEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyRiskExposure" ADD CONSTRAINT "SupplyRiskExposure_supplyRiskEventId_fkey" FOREIGN KEY ("supplyRiskEventId") REFERENCES "SupplyRiskEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResiliencePlan" ADD CONSTRAINT "ResiliencePlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResiliencePlan" ADD CONSTRAINT "ResiliencePlan_supplyRiskEventId_fkey" FOREIGN KEY ("supplyRiskEventId") REFERENCES "SupplyRiskEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
