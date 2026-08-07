-- CreateEnum
CREATE TYPE "InventoryCountSessionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COUNTED', 'REVIEW_REQUIRED', 'APPROVED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryCountLineStatus" AS ENUM ('PENDING', 'MATCHED', 'VARIANCE', 'APPROVED', 'POSTED');

-- CreateEnum
CREATE TYPE "InventoryReconciliationStatus" AS ENUM ('OPEN', 'REVIEWING', 'APPROVED', 'REJECTED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentDirection" AS ENUM ('INCREASE', 'DECREASE', 'NONE');

-- CreateTable
CREATE TABLE "InventoryCountSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countNumber" TEXT NOT NULL,
    "status" "InventoryCountSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "countType" TEXT,
    "locationId" TEXT,
    "startedAt" TIMESTAMP(3),
    "countedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountLine" (
    "id" TEXT NOT NULL,
    "countSessionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "expectedQuantity" DECIMAL(18,4) NOT NULL,
    "countedQuantity" DECIMAL(18,4) NOT NULL,
    "varianceQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "serialLotReference" TEXT,
    "status" "InventoryCountLineStatus" NOT NULL DEFAULT 'PENDING',
    "countedByUserId" TEXT,
    "countedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReconciliation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countSessionId" TEXT NOT NULL,
    "countLineId" TEXT NOT NULL,
    "reconciliationNumber" TEXT NOT NULL,
    "status" "InventoryReconciliationStatus" NOT NULL DEFAULT 'OPEN',
    "direction" "InventoryAdjustmentDirection" NOT NULL,
    "varianceQuantity" DECIMAL(18,4) NOT NULL,
    "reason" TEXT,
    "reviewedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "movementLedgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryCountSession_tenantId_status_createdAt_idx" ON "InventoryCountSession"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryCountSession_locationId_idx" ON "InventoryCountSession"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCountSession_tenantId_countNumber_key" ON "InventoryCountSession"("tenantId", "countNumber");

-- CreateIndex
CREATE INDEX "InventoryCountLine_countSessionId_status_idx" ON "InventoryCountLine"("countSessionId", "status");

-- CreateIndex
CREATE INDEX "InventoryCountLine_inventoryItemId_locationId_idx" ON "InventoryCountLine"("inventoryItemId", "locationId");

-- CreateIndex
CREATE INDEX "InventoryReconciliation_tenantId_status_createdAt_idx" ON "InventoryReconciliation"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryReconciliation_countSessionId_idx" ON "InventoryReconciliation"("countSessionId");

-- CreateIndex
CREATE INDEX "InventoryReconciliation_countLineId_idx" ON "InventoryReconciliation"("countLineId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReconciliation_tenantId_reconciliationNumber_key" ON "InventoryReconciliation"("tenantId", "reconciliationNumber");

-- AddForeignKey
ALTER TABLE "InventoryCountSession" ADD CONSTRAINT "InventoryCountSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_countSessionId_fkey" FOREIGN KEY ("countSessionId") REFERENCES "InventoryCountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReconciliation" ADD CONSTRAINT "InventoryReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReconciliation" ADD CONSTRAINT "InventoryReconciliation_countSessionId_fkey" FOREIGN KEY ("countSessionId") REFERENCES "InventoryCountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReconciliation" ADD CONSTRAINT "InventoryReconciliation_countLineId_fkey" FOREIGN KEY ("countLineId") REFERENCES "InventoryCountLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
