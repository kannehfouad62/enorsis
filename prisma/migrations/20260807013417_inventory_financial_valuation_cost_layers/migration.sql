-- CreateEnum
CREATE TYPE "InventoryFinancialCostMethod" AS ENUM ('FIFO', 'WEIGHTED_AVERAGE', 'STANDARD', 'SPECIFIC_IDENTIFICATION');

-- CreateEnum
CREATE TYPE "InventoryFinancialLayerStatus" AS ENUM ('OPEN', 'PARTIALLY_CONSUMED', 'CONSUMED', 'ADJUSTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InventoryFinancialReconciliationStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'BALANCED', 'APPROVED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InventoryFinancialValuationPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "locationId" TEXT,
    "costMethod" "InventoryFinancialCostMethod" NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    "standardUnitCost" DECIMAL(18,6),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryFinancialValuationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryFinancialCostLayer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sourceMovementId" TEXT,
    "layerNumber" TEXT NOT NULL,
    "status" "InventoryFinancialLayerStatus" NOT NULL DEFAULT 'OPEN',
    "originalQuantity" DECIMAL(18,4) NOT NULL,
    "remainingQuantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,6) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "extendedCost" DECIMAL(18,6) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryFinancialCostLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryFinancialValuationSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(18,4) NOT NULL,
    "averageUnitCost" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "inventoryValue" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryFinancialValuationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryFinancialReconciliation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reconciliationNumber" TEXT NOT NULL,
    "status" "InventoryFinancialReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "inventoryItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(18,4) NOT NULL,
    "ledgerValue" DECIMAL(18,6) NOT NULL,
    "expectedValue" DECIMAL(18,6) NOT NULL,
    "varianceValue" DECIMAL(18,6) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "reason" TEXT,
    "reviewedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryFinancialReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryFinancialValuationPolicy_tenantId_inventoryItemId__idx" ON "InventoryFinancialValuationPolicy"("tenantId", "inventoryItemId", "active");

-- CreateIndex
CREATE INDEX "InventoryFinancialValuationPolicy_locationId_idx" ON "InventoryFinancialValuationPolicy"("locationId");

-- CreateIndex
CREATE INDEX "InventoryFinancialCostLayer_tenantId_inventoryItemId_locati_idx" ON "InventoryFinancialCostLayer"("tenantId", "inventoryItemId", "locationId", "status");

-- CreateIndex
CREATE INDEX "InventoryFinancialCostLayer_sourceMovementId_idx" ON "InventoryFinancialCostLayer"("sourceMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryFinancialCostLayer_tenantId_layerNumber_key" ON "InventoryFinancialCostLayer"("tenantId", "layerNumber");

-- CreateIndex
CREATE INDEX "InventoryFinancialValuationSnapshot_tenantId_asOf_idx" ON "InventoryFinancialValuationSnapshot"("tenantId", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryFinancialValuationSnapshot_tenantId_inventoryItemI_key" ON "InventoryFinancialValuationSnapshot"("tenantId", "inventoryItemId", "locationId");

-- CreateIndex
CREATE INDEX "InventoryFinancialReconciliation_tenantId_status_createdAt_idx" ON "InventoryFinancialReconciliation"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryFinancialReconciliation_inventoryItemId_locationId_idx" ON "InventoryFinancialReconciliation"("inventoryItemId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryFinancialReconciliation_tenantId_reconciliationNum_key" ON "InventoryFinancialReconciliation"("tenantId", "reconciliationNumber");

-- AddForeignKey
ALTER TABLE "InventoryFinancialValuationPolicy" ADD CONSTRAINT "InventoryFinancialValuationPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryFinancialCostLayer" ADD CONSTRAINT "InventoryFinancialCostLayer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryFinancialCostLayer" ADD CONSTRAINT "InventoryFinancialCostLayer_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InventoryFinancialValuationPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryFinancialValuationSnapshot" ADD CONSTRAINT "InventoryFinancialValuationSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryFinancialReconciliation" ADD CONSTRAINT "InventoryFinancialReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
