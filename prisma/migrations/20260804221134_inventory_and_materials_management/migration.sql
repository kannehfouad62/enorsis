-- CreateEnum
CREATE TYPE "InventoryLocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InventoryItemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OBSOLETE');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_TO_STOCK', 'RETURN_TO_SUPPLIER');

-- CreateEnum
CREATE TYPE "CycleCountStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InventoryLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "siteId" TEXT,
    "address" TEXT,
    "status" "InventoryLocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "status" "InventoryItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "catalogItemId" TEXT,
    "manufacturer" TEXT,
    "manufacturerPartNo" TEXT,
    "preferredSupplierId" TEXT,
    "standardCost" DECIMAL(18,4),
    "reorderPoint" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reorderQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "safetyStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER,
    "lotControlled" BOOLEAN NOT NULL DEFAULT false,
    "serialControlled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "inventoryLocationId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantityReserved" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantityAvailable" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "averageUnitCost" DECIMAL(18,4),
    "lastCountedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "inventoryLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4),
    "referenceType" TEXT,
    "referenceId" TEXT,
    "reason" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryLocationId" TEXT NOT NULL,
    "countNumber" TEXT NOT NULL,
    "status" "CycleCountStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "ownerUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCountLine" (
    "id" TEXT NOT NULL,
    "cycleCountId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "expectedQuantity" DECIMAL(18,4) NOT NULL,
    "countedQuantity" DECIMAL(18,4),
    "varianceQuantity" DECIMAL(18,4),
    "varianceValue" DECIMAL(18,2),
    "comments" TEXT,
    "countedByUserId" TEXT,
    "countedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryLocation_tenantId_status_name_idx" ON "InventoryLocation"("tenantId", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLocation_tenantId_code_key" ON "InventoryLocation"("tenantId", "code");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_status_category_idx" ON "InventoryItem"("tenantId", "status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tenantId_sku_key" ON "InventoryItem"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "InventoryBalance_inventoryLocationId_quantityAvailable_idx" ON "InventoryBalance"("inventoryLocationId", "quantityAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_inventoryItemId_inventoryLocationId_key" ON "InventoryBalance"("inventoryItemId", "inventoryLocationId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_tenantId_performedAt_idx" ON "InventoryTransaction"("tenantId", "performedAt");

-- CreateIndex
CREATE INDEX "InventoryTransaction_inventoryItemId_inventoryLocationId_pe_idx" ON "InventoryTransaction"("inventoryItemId", "inventoryLocationId", "performedAt");

-- CreateIndex
CREATE INDEX "CycleCount_tenantId_status_scheduledAt_idx" ON "CycleCount"("tenantId", "status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "CycleCount_tenantId_countNumber_key" ON "CycleCount"("tenantId", "countNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CycleCountLine_cycleCountId_inventoryItemId_key" ON "CycleCountLine"("cycleCountId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_inventoryLocationId_fkey" FOREIGN KEY ("inventoryLocationId") REFERENCES "InventoryLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCount" ADD CONSTRAINT "CycleCount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCount" ADD CONSTRAINT "CycleCount_inventoryLocationId_fkey" FOREIGN KEY ("inventoryLocationId") REFERENCES "InventoryLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountLine" ADD CONSTRAINT "CycleCountLine_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "CycleCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountLine" ADD CONSTRAINT "CycleCountLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
