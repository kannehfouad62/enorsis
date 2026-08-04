-- CreateEnum
CREATE TYPE "DemandPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DemandForecastMethod" AS ENUM ('MANUAL', 'MOVING_AVERAGE', 'WEIGHTED_AVERAGE', 'SEASONAL', 'CONSUMPTION_BASED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "ReplenishmentRecommendationStatus" AS ENUM ('PROPOSED', 'REVIEWED', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "DemandPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DemandPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "planningHorizonDays" INTEGER NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "demandPlanId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "method" "DemandForecastMethod" NOT NULL DEFAULT 'MANUAL',
    "forecastQuantity" DECIMAL(18,4) NOT NULL,
    "historicalConsumption" DECIMAL(18,4),
    "committedDemand" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "safetyStockDemand" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "confidencePercent" INTEGER NOT NULL DEFAULT 50,
    "assumptions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplenishmentRecommendation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "demandPlanId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "status" "ReplenishmentRecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "currentAvailable" DECIMAL(18,4) NOT NULL,
    "forecastDemand" DECIMAL(18,4) NOT NULL,
    "safetyStock" DECIMAL(18,4) NOT NULL,
    "recommendedQuantity" DECIMAL(18,4) NOT NULL,
    "recommendedOrderDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "estimatedUnitCost" DECIMAL(18,4),
    "estimatedTotalCost" DECIMAL(18,2),
    "preferredSupplierId" TEXT,
    "purchaseRequestId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplenishmentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandPlan_tenantId_status_periodEnd_idx" ON "DemandPlan"("tenantId", "status", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "DemandPlan_tenantId_name_periodStart_periodEnd_key" ON "DemandPlan"("tenantId", "name", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "DemandForecast_demandPlanId_inventoryItemId_key" ON "DemandForecast"("demandPlanId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "ReplenishmentRecommendation_tenantId_status_recommendedOrde_idx" ON "ReplenishmentRecommendation"("tenantId", "status", "recommendedOrderDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReplenishmentRecommendation_demandPlanId_inventoryItemId_key" ON "ReplenishmentRecommendation"("demandPlanId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "DemandPlan" ADD CONSTRAINT "DemandPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_demandPlanId_fkey" FOREIGN KEY ("demandPlanId") REFERENCES "DemandPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentRecommendation" ADD CONSTRAINT "ReplenishmentRecommendation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentRecommendation" ADD CONSTRAINT "ReplenishmentRecommendation_demandPlanId_fkey" FOREIGN KEY ("demandPlanId") REFERENCES "DemandPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentRecommendation" ADD CONSTRAINT "ReplenishmentRecommendation_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
