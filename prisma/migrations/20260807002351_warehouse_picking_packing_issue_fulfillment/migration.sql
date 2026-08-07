-- CreateEnum
CREATE TYPE "WarehouseFulfillmentStatus" AS ENUM ('DRAFT', 'ALLOCATED', 'PICKING', 'PICKED', 'PACKED', 'ISSUED', 'COMPLETED', 'CANCELLED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "WarehousePickTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PICKED', 'SHORT_PICK', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehousePackStatus" AS ENUM ('OPEN', 'PACKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseFulfillmentExceptionType" AS ENUM ('INSUFFICIENT_STOCK', 'SHORT_PICK', 'WRONG_ITEM', 'WRONG_LOCATION', 'DAMAGED_STOCK', 'SERIAL_LOT_MISMATCH', 'PACKING_VARIANCE', 'ISSUE_FAILURE', 'OTHER');

-- CreateEnum
CREATE TYPE "WarehouseFulfillmentExceptionStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'WAIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WarehouseFulfillmentOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fulfillmentNumber" TEXT NOT NULL,
    "status" "WarehouseFulfillmentStatus" NOT NULL DEFAULT 'DRAFT',
    "requestType" TEXT,
    "requestId" TEXT,
    "requestedByUserId" TEXT,
    "destinationType" TEXT,
    "destinationId" TEXT,
    "neededAt" TIMESTAMP(3),
    "allocatedAt" TIMESTAMP(3),
    "pickedAt" TIMESTAMP(3),
    "packedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseFulfillmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseFulfillmentLine" (
    "id" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "lineReference" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(18,4) NOT NULL,
    "allocatedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "pickedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "issuedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "serialLotReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseFulfillmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehousePickTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskNumber" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "fulfillmentLineId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(18,4) NOT NULL,
    "pickedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "status" "WarehousePickTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehousePickTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehousePackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageNumber" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "status" "WarehousePackStatus" NOT NULL DEFAULT 'OPEN',
    "packageType" TEXT,
    "grossWeight" DECIMAL(18,4),
    "weightUnit" TEXT,
    "carrierReference" TEXT,
    "trackingReference" TEXT,
    "packedByUserId" TEXT,
    "packedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehousePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseFulfillmentException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "fulfillmentLineId" TEXT,
    "exceptionType" "WarehouseFulfillmentExceptionType" NOT NULL,
    "status" "WarehouseFulfillmentExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseFulfillmentException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarehouseFulfillmentOrder_tenantId_status_createdAt_idx" ON "WarehouseFulfillmentOrder"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WarehouseFulfillmentOrder_requestType_requestId_idx" ON "WarehouseFulfillmentOrder"("requestType", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseFulfillmentOrder_tenantId_fulfillmentNumber_key" ON "WarehouseFulfillmentOrder"("tenantId", "fulfillmentNumber");

-- CreateIndex
CREATE INDEX "WarehouseFulfillmentLine_fulfillmentOrderId_idx" ON "WarehouseFulfillmentLine"("fulfillmentOrderId");

-- CreateIndex
CREATE INDEX "WarehouseFulfillmentLine_inventoryItemId_sourceLocationId_idx" ON "WarehouseFulfillmentLine"("inventoryItemId", "sourceLocationId");

-- CreateIndex
CREATE INDEX "WarehousePickTask_tenantId_status_createdAt_idx" ON "WarehousePickTask"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WarehousePickTask_fulfillmentOrderId_idx" ON "WarehousePickTask"("fulfillmentOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehousePickTask_tenantId_taskNumber_key" ON "WarehousePickTask"("tenantId", "taskNumber");

-- CreateIndex
CREATE INDEX "WarehousePackage_fulfillmentOrderId_status_idx" ON "WarehousePackage"("fulfillmentOrderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WarehousePackage_tenantId_packageNumber_key" ON "WarehousePackage"("tenantId", "packageNumber");

-- CreateIndex
CREATE INDEX "WarehouseFulfillmentException_tenantId_status_severity_idx" ON "WarehouseFulfillmentException"("tenantId", "status", "severity");

-- CreateIndex
CREATE INDEX "WarehouseFulfillmentException_fulfillmentOrderId_idx" ON "WarehouseFulfillmentException"("fulfillmentOrderId");

-- AddForeignKey
ALTER TABLE "WarehouseFulfillmentOrder" ADD CONSTRAINT "WarehouseFulfillmentOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseFulfillmentLine" ADD CONSTRAINT "WarehouseFulfillmentLine_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "WarehouseFulfillmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePickTask" ADD CONSTRAINT "WarehousePickTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePickTask" ADD CONSTRAINT "WarehousePickTask_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "WarehouseFulfillmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePickTask" ADD CONSTRAINT "WarehousePickTask_fulfillmentLineId_fkey" FOREIGN KEY ("fulfillmentLineId") REFERENCES "WarehouseFulfillmentLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePackage" ADD CONSTRAINT "WarehousePackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePackage" ADD CONSTRAINT "WarehousePackage_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "WarehouseFulfillmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseFulfillmentException" ADD CONSTRAINT "WarehouseFulfillmentException_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseFulfillmentException" ADD CONSTRAINT "WarehouseFulfillmentException_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "WarehouseFulfillmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
