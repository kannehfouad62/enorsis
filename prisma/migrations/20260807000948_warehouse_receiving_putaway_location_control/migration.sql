-- CreateEnum
CREATE TYPE "WarehouseReceivingStatus" AS ENUM ('DRAFT', 'RECEIVING', 'RECEIVED', 'PUTAWAY_PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseReceiptLineStatus" AS ENUM ('EXPECTED', 'RECEIVED', 'SHORT', 'OVER', 'DAMAGED', 'REJECTED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "PutawayTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseLocationStatus" AS ENUM ('ACTIVE', 'HOLD', 'BLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WarehouseDiscrepancyStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseDiscrepancyType" AS ENUM ('SHORT_RECEIPT', 'OVER_RECEIPT', 'DAMAGED_GOODS', 'WRONG_ITEM', 'WRONG_LOCATION', 'CAPACITY_EXCEEDED', 'QUARANTINE_REQUIRED', 'SERIAL_LOT_MISMATCH', 'OTHER');

-- CreateTable
CREATE TABLE "WarehouseReceivingSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receivingNumber" TEXT NOT NULL,
    "status" "WarehouseReceivingStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "purchaseOrderId" TEXT,
    "goodsReceiptSessionId" TEXT,
    "supplierId" TEXT,
    "dockLocationId" TEXT,
    "carrierReference" TEXT,
    "deliveryReference" TEXT,
    "receivedByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseReceivingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseReceiptLine" (
    "id" TEXT NOT NULL,
    "receivingSessionId" TEXT NOT NULL,
    "lineReference" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedQuantity" DECIMAL(18,4) NOT NULL,
    "receivedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "acceptedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rejectedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "damagedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "status" "WarehouseReceiptLineStatus" NOT NULL DEFAULT 'EXPECTED',
    "serialLotReference" TEXT,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseLocationControl" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "warehouseCode" TEXT,
    "zoneCode" TEXT,
    "aisleCode" TEXT,
    "binCode" TEXT,
    "status" "WarehouseLocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "capacityQuantity" DECIMAL(18,4),
    "occupiedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "allowsMixedItems" BOOLEAN NOT NULL DEFAULT true,
    "requiresLot" BOOLEAN NOT NULL DEFAULT false,
    "requiresSerial" BOOLEAN NOT NULL DEFAULT false,
    "quarantineOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseLocationControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PutawayTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskNumber" TEXT NOT NULL,
    "receivingSessionId" TEXT NOT NULL,
    "receiptLineId" TEXT NOT NULL,
    "destinationControlId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "status" "PutawayTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "movementLedgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PutawayTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseDiscrepancy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receivingSessionId" TEXT NOT NULL,
    "receiptLineId" TEXT,
    "discrepancyType" "WarehouseDiscrepancyType" NOT NULL,
    "status" "WarehouseDiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseDiscrepancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarehouseReceivingSession_tenantId_status_createdAt_idx" ON "WarehouseReceivingSession"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WarehouseReceivingSession_purchaseOrderId_idx" ON "WarehouseReceivingSession"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "WarehouseReceivingSession_goodsReceiptSessionId_idx" ON "WarehouseReceivingSession"("goodsReceiptSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseReceivingSession_tenantId_receivingNumber_key" ON "WarehouseReceivingSession"("tenantId", "receivingNumber");

-- CreateIndex
CREATE INDEX "WarehouseReceiptLine_receivingSessionId_status_idx" ON "WarehouseReceiptLine"("receivingSessionId", "status");

-- CreateIndex
CREATE INDEX "WarehouseReceiptLine_inventoryItemId_idx" ON "WarehouseReceiptLine"("inventoryItemId");

-- CreateIndex
CREATE INDEX "WarehouseLocationControl_tenantId_status_idx" ON "WarehouseLocationControl"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WarehouseLocationControl_warehouseCode_zoneCode_idx" ON "WarehouseLocationControl"("warehouseCode", "zoneCode");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseLocationControl_tenantId_locationId_key" ON "WarehouseLocationControl"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "PutawayTask_tenantId_status_createdAt_idx" ON "PutawayTask"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PutawayTask_receivingSessionId_idx" ON "PutawayTask"("receivingSessionId");

-- CreateIndex
CREATE INDEX "PutawayTask_destinationControlId_idx" ON "PutawayTask"("destinationControlId");

-- CreateIndex
CREATE UNIQUE INDEX "PutawayTask_tenantId_taskNumber_key" ON "PutawayTask"("tenantId", "taskNumber");

-- CreateIndex
CREATE INDEX "WarehouseDiscrepancy_tenantId_status_severity_idx" ON "WarehouseDiscrepancy"("tenantId", "status", "severity");

-- CreateIndex
CREATE INDEX "WarehouseDiscrepancy_receivingSessionId_idx" ON "WarehouseDiscrepancy"("receivingSessionId");

-- AddForeignKey
ALTER TABLE "WarehouseReceivingSession" ADD CONSTRAINT "WarehouseReceivingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseReceiptLine" ADD CONSTRAINT "WarehouseReceiptLine_receivingSessionId_fkey" FOREIGN KEY ("receivingSessionId") REFERENCES "WarehouseReceivingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseLocationControl" ADD CONSTRAINT "WarehouseLocationControl_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutawayTask" ADD CONSTRAINT "PutawayTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutawayTask" ADD CONSTRAINT "PutawayTask_receivingSessionId_fkey" FOREIGN KEY ("receivingSessionId") REFERENCES "WarehouseReceivingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutawayTask" ADD CONSTRAINT "PutawayTask_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "WarehouseReceiptLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutawayTask" ADD CONSTRAINT "PutawayTask_destinationControlId_fkey" FOREIGN KEY ("destinationControlId") REFERENCES "WarehouseLocationControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseDiscrepancy" ADD CONSTRAINT "WarehouseDiscrepancy_receivingSessionId_fkey" FOREIGN KEY ("receivingSessionId") REFERENCES "WarehouseReceivingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseDiscrepancy" ADD CONSTRAINT "WarehouseDiscrepancy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
