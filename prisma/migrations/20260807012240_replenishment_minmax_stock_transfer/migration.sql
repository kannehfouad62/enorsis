-- CreateEnum
CREATE TYPE "ReplenishmentPolicyStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "StockReplenishmentRecommendationStatus" AS ENUM ('OPEN', 'APPROVED', 'TRANSFER_CREATED', 'DISMISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('DRAFT', 'APPROVED', 'PICKING', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "StockTransferExceptionStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockTransferExceptionType" AS ENUM ('INSUFFICIENT_SOURCE_STOCK', 'DESTINATION_CAPACITY', 'TRACEABILITY_HOLD', 'QUANTITY_VARIANCE', 'LOCATION_BLOCKED', 'OTHER');

-- CreateTable
CREATE TABLE "ReplenishmentPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" "ReplenishmentPolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "minimumQuantity" DECIMAL(18,4) NOT NULL,
    "maximumQuantity" DECIMAL(18,4) NOT NULL,
    "reorderQuantity" DECIMAL(18,4),
    "sourceLocationId" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "safetyStockQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplenishmentPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReplenishmentRecommendation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "recommendationNumber" TEXT NOT NULL,
    "status" "StockReplenishmentRecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "inventoryItemId" TEXT NOT NULL,
    "sourceLocationId" TEXT,
    "destinationLocationId" TEXT NOT NULL,
    "currentQuantity" DECIMAL(18,4) NOT NULL,
    "minimumQuantity" DECIMAL(18,4) NOT NULL,
    "maximumQuantity" DECIMAL(18,4) NOT NULL,
    "recommendedQuantity" DECIMAL(18,4) NOT NULL,
    "reason" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "stockTransferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReplenishmentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "inventoryItemId" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(18,4) NOT NULL,
    "shippedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "receivedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "recommendationId" TEXT,
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "shippedByUserId" TEXT,
    "receivedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "outboundMovementId" TEXT,
    "inboundMovementId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransferOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stockTransferId" TEXT NOT NULL,
    "exceptionType" "StockTransferExceptionType" NOT NULL,
    "status" "StockTransferExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransferException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReplenishmentPolicy_tenantId_status_idx" ON "ReplenishmentPolicy"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReplenishmentPolicy_sourceLocationId_idx" ON "ReplenishmentPolicy"("sourceLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplenishmentPolicy_tenantId_inventoryItemId_locationId_key" ON "ReplenishmentPolicy"("tenantId", "inventoryItemId", "locationId");

-- CreateIndex
CREATE INDEX "StockReplenishmentRecommendation_tenantId_status_createdAt_idx" ON "StockReplenishmentRecommendation"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StockReplenishmentRecommendation_inventoryItemId_destinatio_idx" ON "StockReplenishmentRecommendation"("inventoryItemId", "destinationLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockReplenishmentRecommendation_tenantId_recommendationNum_key" ON "StockReplenishmentRecommendation"("tenantId", "recommendationNumber");

-- CreateIndex
CREATE INDEX "StockTransferOrder_tenantId_status_createdAt_idx" ON "StockTransferOrder"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StockTransferOrder_inventoryItemId_idx" ON "StockTransferOrder"("inventoryItemId");

-- CreateIndex
CREATE INDEX "StockTransferOrder_sourceLocationId_idx" ON "StockTransferOrder"("sourceLocationId");

-- CreateIndex
CREATE INDEX "StockTransferOrder_destinationLocationId_idx" ON "StockTransferOrder"("destinationLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransferOrder_tenantId_transferNumber_key" ON "StockTransferOrder"("tenantId", "transferNumber");

-- CreateIndex
CREATE INDEX "StockTransferException_tenantId_status_severity_idx" ON "StockTransferException"("tenantId", "status", "severity");

-- CreateIndex
CREATE INDEX "StockTransferException_stockTransferId_idx" ON "StockTransferException"("stockTransferId");

-- AddForeignKey
ALTER TABLE "ReplenishmentPolicy" ADD CONSTRAINT "ReplenishmentPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReplenishmentRecommendation" ADD CONSTRAINT "StockReplenishmentRecommendation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReplenishmentRecommendation" ADD CONSTRAINT "StockReplenishmentRecommendation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ReplenishmentPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReplenishmentRecommendation" ADD CONSTRAINT "StockReplenishmentRecommendation_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferOrder" ADD CONSTRAINT "StockTransferOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferException" ADD CONSTRAINT "StockTransferException_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferException" ADD CONSTRAINT "StockTransferException_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "StockTransferOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
