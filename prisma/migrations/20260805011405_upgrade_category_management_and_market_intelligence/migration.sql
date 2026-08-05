-- CreateEnum
CREATE TYPE "CategoryOpportunityType" AS ENUM ('SOURCING', 'RENEGOTIATION', 'DEMAND_MANAGEMENT', 'SPECIFICATION_OPTIMIZATION', 'SUPPLIER_CONSOLIDATION', 'PROCESS_IMPROVEMENT', 'RISK_REDUCTION', 'SUSTAINABILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryOpportunityStatus" AS ENUM ('IDENTIFIED', 'QUALIFYING', 'APPROVED', 'IN_PROGRESS', 'REALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketSignalType" AS ENUM ('PRICE', 'CAPACITY', 'SUPPLY_RISK', 'REGULATORY', 'TECHNOLOGY', 'GEOPOLITICAL', 'SUSTAINABILITY', 'LABOR', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketSignalDirection" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- AlterTable
ALTER TABLE "CategoryStrategy" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "categoryCode" TEXT,
ADD COLUMN     "categoryName" TEXT,
ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "demandDrivers" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "executiveSponsorUserId" TEXT,
ADD COLUMN     "managedSpend" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "preferredSupplierCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "strategicObjectives" TEXT,
ADD COLUMN     "supplyMarketSummary" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "CategoryOpportunity" (
    "id" TEXT NOT NULL,
    "categoryStrategyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CategoryOpportunityType" NOT NULL,
    "status" "CategoryOpportunityStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "estimatedValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "probabilityPercent" INTEGER NOT NULL DEFAULT 50,
    "complexityScore" INTEGER NOT NULL DEFAULT 3,
    "riskScore" INTEGER NOT NULL DEFAULT 3,
    "ownerUserId" TEXT NOT NULL,
    "targetStartAt" TIMESTAMP(3),
    "targetCompletionAt" TIMESTAMP(3),
    "sourcingEventId" TEXT,
    "contractId" TEXT,
    "valueInitiativeId" TEXT,
    "assumptions" TEXT,
    "blockers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryMarketSignal" (
    "id" TEXT NOT NULL,
    "categoryStrategyId" TEXT NOT NULL,
    "type" "MarketSignalType" NOT NULL,
    "direction" "MarketSignalDirection" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "sourceUrl" TEXT,
    "confidencePercent" INTEGER NOT NULL DEFAULT 50,
    "impactScore" INTEGER NOT NULL DEFAULT 3,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryMarketSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryOpportunity_categoryStrategyId_status_targetComplet_idx" ON "CategoryOpportunity"("categoryStrategyId", "status", "targetCompletionAt");

-- CreateIndex
CREATE INDEX "CategoryMarketSignal_categoryStrategyId_type_observedAt_idx" ON "CategoryMarketSignal"("categoryStrategyId", "type", "observedAt");

-- AddForeignKey
ALTER TABLE "CategoryOpportunity" ADD CONSTRAINT "CategoryOpportunity_categoryStrategyId_fkey" FOREIGN KEY ("categoryStrategyId") REFERENCES "CategoryStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryMarketSignal" ADD CONSTRAINT "CategoryMarketSignal_categoryStrategyId_fkey" FOREIGN KEY ("categoryStrategyId") REFERENCES "CategoryStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
